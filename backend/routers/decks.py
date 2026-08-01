from io import BytesIO
from pathlib import PurePosixPath
from typing import List
from zipfile import BadZipFile, ZipFile
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from database import get_session
from models import Deck, Question, Answer, User, QuizSession
from parser import parse_txt_file
from routers.auth import get_current_user
from schemas import QuestionUpdate, QuestionCreate, DeckWithQuestions
from translation import enqueue_deck_translation
from limits import (
    MAX_ANSWERS_PER_QUESTION, MAX_ANSWER_LENGTH, MAX_DECKS_PER_USER,
    MAX_DECK_TITLE_LENGTH, MAX_QUESTION_LENGTH, MAX_QUESTIONS_PER_DECK,
    MAX_QUESTIONS_PER_USER, MAX_UPLOAD_FILES, MAX_UPLOAD_TOTAL_SIZE,
)

MAX_FILE_SIZE = 1 * 1024 * 1024
MAX_ZIP_SIZE = 10 * 1024 * 1024
MAX_ARCHIVE_FILES = MAX_UPLOAD_FILES
MAX_ARCHIVE_ENTRIES = 1000
MAX_ARCHIVE_UNCOMPRESSED_SIZE = 20 * 1024 * 1024

router = APIRouter(prefix="/decks", tags=["Decks"])


def _decode_question_file(filename: str, content: bytes) -> tuple[str, str]:
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"Plik {filename} przekracza limit 1 MB")
    if not content:
        raise HTTPException(status_code=400, detail=f"Plik {filename} jest pusty")

    encodings = ['utf-8-sig']
    if content.startswith((b'\xff\xfe', b'\xfe\xff')):
        encodings.insert(0, 'utf-16')
    encodings.append('cp1250')

    for encoding in encodings:
        try:
            text = content.decode(encoding)
        except UnicodeDecodeError:
            continue
        control_chars = sum(ord(char) < 32 and char not in '\r\n\t' for char in text)
        if '\x00' not in text and control_chars <= max(2, len(text) // 100):
            return filename, text

    raise HTTPException(
        status_code=400,
        detail=f"Plik {filename} nie jest poprawnym plikiem tekstowym (UTF-8, UTF-16 lub Windows-1250)",
    )


def _read_zip(filename: str, content: bytes) -> list[tuple[str, str]]:
    if len(content) > MAX_ZIP_SIZE:
        raise HTTPException(status_code=413, detail="Archiwum ZIP przekracza limit 10 MB")
    try:
        with ZipFile(BytesIO(content)) as archive:
            entries = [entry for entry in archive.infolist() if not entry.is_dir()]
            if not entries:
                raise HTTPException(status_code=400, detail="Archiwum ZIP jest puste")
            if len(entries) > MAX_ARCHIVE_ENTRIES:
                raise HTTPException(status_code=413, detail=f"Archiwum może zawierać maksymalnie {MAX_ARCHIVE_ENTRIES} wpisów")

            text_entries = [
                entry for entry in entries
                if PurePosixPath(entry.filename.replace('\\', '/')).suffix.lower() == '.txt'
            ]
            if not text_entries:
                raise HTTPException(status_code=400, detail="Archiwum ZIP nie zawiera plików .txt")
            if len(text_entries) > MAX_ARCHIVE_FILES:
                raise HTTPException(status_code=413, detail=f"Archiwum może zawierać maksymalnie {MAX_ARCHIVE_FILES} plików TXT")
            if sum(entry.file_size for entry in text_entries) > MAX_ARCHIVE_UNCOMPRESSED_SIZE:
                raise HTTPException(status_code=413, detail="Rozpakowane pliki TXT przekraczają limit 20 MB")

            result = []
            actual_uncompressed_size = 0
            for entry in text_entries:
                path = PurePosixPath(entry.filename.replace('\\', '/'))
                if path.is_absolute() or '..' in path.parts:
                    raise HTTPException(status_code=400, detail="Archiwum zawiera niebezpieczną ścieżkę")
                if entry.flag_bits & 0x1:
                    raise HTTPException(status_code=400, detail=f"Plik {entry.filename} jest zaszyfrowany")
                if entry.file_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail=f"Plik {entry.filename} w ZIP przekracza limit 1 MB")
                with archive.open(entry) as archived_file:
                    extracted = archived_file.read(MAX_FILE_SIZE + 1)
                if len(extracted) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail=f"Plik {entry.filename} po rozpakowaniu przekracza limit 1 MB")
                actual_uncompressed_size += len(extracted)
                if actual_uncompressed_size > MAX_ARCHIVE_UNCOMPRESSED_SIZE:
                    raise HTTPException(status_code=413, detail="Rozpakowane pliki TXT przekraczają limit 20 MB")
                result.append(_decode_question_file(entry.filename, extracted))
            return result
    except BadZipFile as exc:
        raise HTTPException(status_code=400, detail=f"Plik {filename} nie jest poprawnym archiwum ZIP") from exc

# --- POBIERZ MOJE ZESTAWY ---
@router.get("/mine", response_model=List[Deck])
def read_my_decks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Zwraca listę zestawów należących do zalogowanego użytkownika."""
    statement = select(Deck).where(Deck.user_id == current_user.id)
    return session.exec(statement).all()

# --- UPLOAD ZESTAWU ---
@router.post("/upload-form")
async def upload_deck_form_secure(
    files: List[UploadFile] = File(...),
    deck_name: str = Form(..., min_length=3, max_length=MAX_DECK_TITLE_LENGTH),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    normalized_name = deck_name.strip()
    if len(normalized_name) < 3:
        raise HTTPException(status_code=422, detail="Nazwa zestawu musi mieć co najmniej 3 znaki")

    if not files:
        raise HTTPException(status_code=400, detail="Wybierz pliki pytań lub archiwum ZIP")
    if len(files) > MAX_UPLOAD_FILES:
        raise HTTPException(status_code=413, detail=f"Jednorazowo można przesłać maksymalnie {MAX_UPLOAD_FILES} plików")
    deck_count = session.exec(select(func.count(Deck.id)).where(Deck.user_id == current_user.id)).one()
    if deck_count >= MAX_DECKS_PER_USER:
        raise HTTPException(status_code=409, detail=f"Limit zestawów wynosi {MAX_DECKS_PER_USER}")

    suffixes = [PurePosixPath((file.filename or '').lower()).suffix for file in files]
    if any(suffix not in {'.txt', '.zip'} for suffix in suffixes):
        raise HTTPException(status_code=400, detail="Dozwolone są wyłącznie pliki .txt albo jedno archiwum .zip")
    if '.zip' in suffixes and (len(files) != 1 or suffixes[0] != '.zip'):
        raise HTTPException(status_code=400, detail="Archiwum ZIP należy przesłać osobno")

    question_files = []
    total_uploaded = 0
    for index, file in enumerate(files):
        read_limit = MAX_ZIP_SIZE if suffixes[index] == '.zip' else MAX_FILE_SIZE
        content = await file.read(read_limit + 1)
        if len(content) > read_limit:
            raise HTTPException(status_code=413, detail=f"Plik {file.filename or 'plik'} przekracza dozwolony limit")
        total_uploaded += len(content)
        if total_uploaded > MAX_UPLOAD_TOTAL_SIZE:
            raise HTTPException(status_code=413, detail="Łączny rozmiar plików przekracza limit 20 MB")
        filename = file.filename or 'plik'
        if suffixes[index] == '.zip':
            question_files.extend(_read_zip(filename, content))
        else:
            question_files.append(_decode_question_file(filename, content))

    parsed_questions = []
    for filename, text_content in question_files:
        if not text_content.strip():
            raise HTTPException(status_code=400, detail=f"Plik {filename} jest pusty")
        questions = parse_txt_file(text_content)
        if not questions:
            raise HTTPException(status_code=400, detail=f"W pliku {filename} nie znaleziono pytań w obsługiwanym formacie")
        parsed_questions.extend(questions)

    if len(parsed_questions) > MAX_QUESTIONS_PER_DECK:
        raise HTTPException(status_code=413, detail=f"Zestaw może zawierać maksymalnie {MAX_QUESTIONS_PER_DECK} pytań")
    user_question_count = session.exec(
        select(func.count(Question.id)).join(Deck).where(Deck.user_id == current_user.id)
    ).one()
    if user_question_count + len(parsed_questions) > MAX_QUESTIONS_PER_USER:
        raise HTTPException(status_code=409, detail=f"Łączny limit pytań użytkownika wynosi {MAX_QUESTIONS_PER_USER}")

    # Import ma być szybki: zapisujemy wyłącznie polski oryginał.
    # Angielska kopia powstanie na żądanie po przełączeniu aplikacji na EN.
    new_deck = Deck(title=normalized_name, translation_status="pending", user_id=current_user.id)
    session.add(new_deck)
    try:
        session.flush()
        questions_count = 0
        for item in parsed_questions:
            q_text = item.get('content', '').strip() if isinstance(item, dict) else ''
            answers = item.get('answers', []) if isinstance(item, dict) else []
            if not q_text or not answers:
                raise HTTPException(status_code=400, detail="Każde pytanie musi mieć treść i co najmniej jedną odpowiedź")
            if len(q_text) > MAX_QUESTION_LENGTH:
                raise HTTPException(status_code=413, detail=f"Pytanie przekracza limit {MAX_QUESTION_LENGTH} znaków")
            if len(answers) > MAX_ANSWERS_PER_QUESTION:
                raise HTTPException(status_code=413, detail=f"Pytanie może mieć maksymalnie {MAX_ANSWERS_PER_QUESTION} odpowiedzi")

            question = Question(content=q_text, deck_id=new_deck.id)
            session.add(question)
            session.flush()
            for answer_data in answers:
                answer_text = str(answer_data.get('content', '')).strip() if isinstance(answer_data, dict) else ''
                if not answer_text:
                    raise HTTPException(status_code=400, detail=f"Pytanie „{q_text[:40]}” zawiera pustą odpowiedź")
                if len(answer_text) > MAX_ANSWER_LENGTH:
                    raise HTTPException(status_code=413, detail=f"Odpowiedź przekracza limit {MAX_ANSWER_LENGTH} znaków")
                session.add(Answer(
                    content=answer_text,
                    is_correct=bool(answer_data.get('is_correct', False)),
                    question_id=question.id,
                ))
            questions_count += 1

        session.commit()
        session.refresh(new_deck)
    except Exception:
        session.rollback()
        raise

    return {"deck_id": new_deck.id, "deck_title": new_deck.title, "questions_added": questions_count, "translation_status": "pending"}


async def upload_deck_form(
    files: List[UploadFile] = File(...),
    deck_name: str = Form(..., min_length=3, description="Nazwa musi mieć min 3 znaki"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Tworzy jeden zestaw z wielu plików dla zalogowanego usera."""
    
    # 1. Tworzymy pusty zestaw
    new_deck = Deck(title=deck_name, user_id=current_user.id)
    session.add(new_deck)
    session.commit()
    session.refresh(new_deck)
    
    questions_count = 0
    
    # 2. Iterujemy przez pliki
    for file in files:
        if not file.filename.endswith(".txt"):
            continue 

        file.file.seek(0, 2)
        file_size = file.file.tell()
        await file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            continue

        text_content = ""
        try:
            content = await file.read()
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            continue

        if not text_content:
            continue

        questions_data = parse_txt_file(text_content)
        
        # PĘTLA GŁÓWNA
        for item in questions_data:
            q_text = ""
            answers_list = []

            # --- A. PRZYPADEK: Parser zwraca Słownik (Twój przypadek ze screena) ---
            if isinstance(item, dict):
                q_text = item.get("content", "")
                raw_answers = item.get("answers", [])
                
                # Przerabiamy odpowiedzi ze słowników na format (treść, czy_poprawna)
                for ans in raw_answers:
                    if isinstance(ans, dict):
                        answers_list.append((ans.get("content", ""), ans.get("is_correct", False)))
                    elif isinstance(ans, (list, tuple)) and len(ans) == 2:
                        answers_list.append(ans)
                    else:
                        answers_list.append((str(ans), False))

            # --- B. PRZYPADEK: Parser zwraca Krotkę (content, answers) ---
            elif isinstance(item, (list, tuple)) and len(item) == 2:
                q_text, raw_answers = item
                answers_list = raw_answers # Zakładamy, że tu format jest już OK

            # --- C. PRZYPADEK: Sam tekst ---
            else:
                q_text = str(item)
                answers_list = []

            # Zapis do bazy (tylko jeśli mamy treść pytania)
            if q_text:
                q = Question(content=q_text, deck_id=new_deck.id)
                session.add(q)
                session.commit()
                session.refresh(q)
                
                for ans_item in answers_list:
                    # Upewniamy się, że mamy parę (tekst, bool)
                    if isinstance(ans_item, (list, tuple)) and len(ans_item) == 2:
                        a_text, a_correct = ans_item
                    else:
                        a_text = str(ans_item)
                        a_correct = False
                        
                    a = Answer(
                        content=str(a_text), 
                        is_correct=a_correct, 
                        question_id=q.id
                    )
                    session.add(a)
                
                questions_count += 1

    session.commit()
    return {
        "deck_id": new_deck.id, 
        "deck_title": new_deck.title, 
        "questions_added": questions_count
    }

# --- EDYCJA PYTANIA (FULL) ---
@router.put("/question/{question_id}/full")
def update_full_question(
    question_id: int,
    data: QuestionUpdate,  # <--- TU ZMIANA: FastAPI samo sprawdzi dane!
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Pobieramy pytanie z bazy
    statement = select(Question).where(Question.id == question_id).options(selectinload(Question.deck))
    question = session.exec(statement).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Pytanie nie istnieje")
    
    if question.deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    # 2. Aktualizujemy treść (Pydantic już sprawdził, że content > 3 znaki)
    question.content = data.content
    question.content_en = None
    session.add(question)

    # 3. Aktualizujemy odpowiedzi
    # data.answers to teraz lista obiektów, a nie słowników!
    for ans_data in data.answers:
        answer = session.get(Answer, ans_data.id)
        
        if answer and answer.question_id == question.id:
            answer.content = ans_data.content
            answer.content_en = None
            answer.is_correct = ans_data.is_correct
            session.add(answer)

    question.deck.translation_status = "pending"
    question.deck.translation_completed = 0
    session.add(question.deck)
    session.commit()
    return {"ok": True}

# --- USUWANIE ZESTAWU ---
@router.delete("/{deck_id}")
def delete_deck(
    deck_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")
    
    if deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="To nie Twój zestaw!")
    
    # Usuwamy sesje quizu (ważne!)
    quiz_sessions = session.exec(select(QuizSession).where(QuizSession.deck_id == deck_id)).all()
    for qs in quiz_sessions:
        session.delete(qs)

    # Usuwamy pytania i odpowiedzi
    questions = session.exec(select(Question).where(Question.deck_id == deck_id)).all()
    for question in questions:
        answers = session.exec(select(Answer).where(Answer.question_id == question.id)).all()
        for answer in answers:
            session.delete(answer)
        session.delete(question)

    session.delete(deck)
    session.commit()
    
    return {"message": "Zestaw usunięty"}

# --- USUWANIE PYTANIA ---
@router.delete("/question/{question_id}")
def delete_question(
    question_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Question).where(Question.id == question_id).options(selectinload(Question.deck))
    question = session.exec(statement).first()

    if not question:
        raise HTTPException(status_code=404, detail="Nie znaleziono pytania")
    
    if question.deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nie możesz usuwać nie swoich pytań")

    # Usuwamy odpowiedzi
    statement_ans = select(Answer).where(Answer.question_id == question_id)
    answers = session.exec(statement_ans).all()
    for ans in answers:
        session.delete(ans)

    session.delete(question)
    session.commit()
    return {"ok": True, "message": "Usunięto pytanie"}

# --- DODAWANIE PYTANIA ---
@router.post("/{deck_id}/question")
def add_question_to_deck(
    deck_id: int,
    data: QuestionCreate, # <--- Używamy schematu (automatyczna walidacja)
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    deck = session.get(Deck, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Brak dostępu")
    deck_question_count = session.exec(select(func.count(Question.id)).where(Question.deck_id == deck_id)).one()
    user_question_count = session.exec(
        select(func.count(Question.id)).join(Deck).where(Deck.user_id == current_user.id)
    ).one()
    if deck_question_count >= MAX_QUESTIONS_PER_DECK or user_question_count >= MAX_QUESTIONS_PER_USER:
        raise HTTPException(status_code=409, detail="Osiągnięto limit pytań")
    
    # Tu zmiana: bierzemy content z obiektu data
    new_q = Question(content=data.content, deck_id=deck_id)
    session.add(new_q)
    session.commit()
    session.refresh(new_q)
    
    # Dodajemy 4 puste odpowiedzi na start
    for i in range(4):
        polish_content = f"Odpowiedź {i+1}"
        session.add(Answer(content=polish_content, is_correct=False, question_id=new_q.id))
    
    deck.translation_status = "pending"
    deck.translation_completed = 0
    session.add(deck)
    session.commit()
    return {"id": new_q.id, "content": new_q.content}

@router.post("/{deck_id}/translate")
def translate_deck_to_english(
    deck_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Uzupełnia angielską kopię. Polskie pola źródłowe nigdy nie są modyfikowane."""
    statement = (
        select(Deck)
        .where(Deck.id == deck_id)
        .options(selectinload(Deck.questions).selectinload(Question.answers))
    )
    deck = session.exec(statement).first()
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")

    if deck.translation_status != "processing":
        deck.translation_status = "queued"
        deck.translation_completed = 0
        session.add(deck)
        session.commit()
        queue_result = enqueue_deck_translation(deck.id, current_user.id)
        if queue_result in {"user_limit", "global_limit"}:
            deck.translation_status = "pending"
            session.add(deck)
            session.commit()
            detail = "Masz już maksymalną liczbę tłumaczeń w kolejce" if queue_result == "user_limit" else "Kolejka tłumaczeń jest pełna"
            raise HTTPException(status_code=429, detail=detail)
        queued = queue_result == "queued"
    else:
        queued = False
    return {"ok": True, "queued": queued, "translation_status": deck.translation_status}


# --- POBIERZ POJEDYNCZY ZESTAW ---
@router.get("/{deck_id}", response_model=DeckWithQuestions)
def get_single_deck(
    deck_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Pobiera jeden zestaw wraz z pytaniami i odpowiedziami."""
    
    # 1. Pobieramy zestaw z bazy + ładujemy relacje (Pytania -> Odpowiedzi)
    # Używamy selectinload, żeby pobrać wszystko w jednym zapytaniu (Eager Loading)
    statement = (
        select(Deck)
        .where(Deck.id == deck_id)
        .options(selectinload(Deck.questions).selectinload(Question.answers))
    )
    deck = session.exec(statement).first()

    # 2. Sprawdzamy czy istnieje
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")

    # 3. Sprawdzamy czy należy do użytkownika
    if deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nie masz dostępu do tego zestawu")

    return deck
