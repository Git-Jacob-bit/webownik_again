from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, status, Body
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from database import get_session
from models import Deck, Question, Answer, QuestionRead, User, QuizSession
from parser import parse_txt_file
from routers.auth import get_current_user  # <--- Strażnik (wymaga tokena)

router = APIRouter(prefix="/decks", tags=["Decks"])

# --- NOWY ENDPOINT: Pobierz tylko MOJE zestawy ---
@router.get("/mine", response_model=List[Deck])
def read_my_decks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Zwraca listę zestawów należących do zalogowanego użytkownika."""
    statement = select(Deck).where(Deck.user_id == current_user.id)
    return session.exec(statement).all()

# --- ZMODYFIKOWANY UPLOAD: Bezpieczny i zwraca JSON ---
@router.post("/upload-form")
async def upload_deck_form(
    files: List[UploadFile] = File(...),
    deck_name: str = Form(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # <--- Sprawdzamy kim jesteś
):
    """Tworzy jeden zestaw z wielu plików dla zalogowanego usera."""
    
    # 1. Tworzymy zestaw przypisany do current_user
    new_deck = Deck(title=deck_name, user_id=current_user.id)
    session.add(new_deck)
    session.commit()
    session.refresh(new_deck)

    # 2. Iterujemy przez pliki
    for file in files:
        content = await file.read()
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content.decode("cp1250")

        parsed_data = parse_txt_file(text_content)
        
        if not parsed_data:
            continue

        for q_data in parsed_data:
            question = Question(content=q_data["content"], deck_id=new_deck.id)
            session.add(question)
            session.commit()
            session.refresh(question)
            
            for a_data in q_data["answers"]:
                answer = Answer(
                    content=a_data["content"], 
                    is_correct=a_data["is_correct"], 
                    question_id=question.id
                )
                session.add(answer)
    
    session.commit()
    
    # Zwracamy JSON, żeby JS wiedział, że się udało
    return {"message": "Zestaw utworzony", "deck_id": new_deck.id, "title": new_deck.title}

# --- POBIERANIE PYTAŃ (Dostępne dla właściciela) ---
@router.put("/question/{question_id}/full")
def update_full_question(
    question_id: int,
    data: dict = Body(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Aktualizuje treść pytania i wszystkie jego odpowiedzi za jednym zamachem."""
    
    # Używamy selectinload, aby od razu mieć dostęp do deck (do sprawdzenia user_id)
    # oraz do answers (żeby móc je edytować)
    statement = (
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.deck), selectinload(Question.answers))
    )
    question = session.exec(statement).first()

    if not question:
        raise HTTPException(status_code=404, detail="Pytanie nie istnieje")
    
    if question.deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień do tego zestawu")

    # 1. Aktualizacja treści pytania
    question.content = data.get("content")
    session.add(question)

    # 2. Aktualizacja odpowiedzi przysłanych w liście
    # Oczekujemy formatu: answers: [{id: 1, content: "...", is_correct: true}, ...]
    received_answers = data.get("answers", [])
    
    for ans_data in received_answers:
        # Szukamy odpowiedzi w bazie danych
        ans_obj = session.get(Answer, ans_data["id"])
        
        # Bezpieczeństwo: sprawdzamy czy odpowiedź należy do tego pytania
        if ans_obj and ans_obj.question_id == question.id:
            ans_obj.content = ans_data["content"]
            ans_obj.is_correct = ans_data["is_correct"]
            session.add(ans_obj)

    session.commit()
    return {"ok": True, "message": "Pytanie i odpowiedzi zaktualizowane"}

# --- USUWANIE (Tylko właściciel) ---
@router.delete("/{deck_id}")
def delete_deck(
    deck_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Szukamy zestawu
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")
    
    # 2. Sprawdzamy czy użytkownik jest właścicielem
    if deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="To nie Twój zestaw!")
    
    # 3. USUWANIE POWIĄZAŃ (Kluczowe!)
    # Najpierw usuwamy sesje quizu dla tego zestawu (to naprawia Twój błąd)
    quiz_sessions = session.exec(select(QuizSession).where(QuizSession.deck_id == deck_id)).all()
    for qs in quiz_sessions:
        session.delete(qs)

    # 4. Usuwamy pytania i odpowiedzi (kaskadowo)
    questions = session.exec(select(Question).where(Question.deck_id == deck_id)).all()
    for question in questions:
        # Usuwamy odpowiedzi przypisane do pytania
        answers = session.exec(select(Answer).where(Answer.question_id == question.id)).all()
        for answer in answers:
            session.delete(answer)
        session.delete(question)

    # 5. Na końcu usuwamy sam zestaw
    session.delete(deck)
    
    # 6. Zatwierdzamy wszystko jedną transakcją
    session.commit()
    
    return {"message": "Zestaw, pytania i sesje zostały pomyślnie usunięte"}

@router.delete("/question/{question_id}")
def delete_question(
    question_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Musimy załadować deck, żeby sprawdzić właściciela
    statement = select(Question).where(Question.id == question_id).options(selectinload(Question.deck))
    question = session.exec(statement).first()

    if not question:
        raise HTTPException(status_code=404, detail="Nie znaleziono pytania")
    
    if question.deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nie możesz usuwać nie swoich pytań")

    # Usuwamy odpowiedzi ręcznie, jeśli w modelach nie masz cascade delete
    statement_ans = select(Answer).where(Answer.question_id == question_id)
    answers = session.exec(statement_ans).all()
    for ans in answers:
        session.delete(ans)

    session.delete(question)
    session.commit()
    return {"ok": True, "message": "Usunięto pytanie i jego odpowiedzi"}

# --- DODAWANIE NOWEGO PYTANIA DO ISTNIEJĄCEGO ZESTAWU ---
@router.post("/{deck_id}/question")
def add_question_to_deck(
    deck_id: int,
    content: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    deck = session.get(Deck, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Zestaw nie istnieje lub brak dostępu")
    
    new_q = Question(content=content, deck_id=deck_id)
    session.add(new_q)
    session.commit()
    session.refresh(new_q)
    
    # Opcjonalnie: dodaj od razu 4 puste odpowiedzi, żeby edytor miał co wyświetlić
    for i in range(4):
        session.add(Answer(content=f"Odpowiedź {i+1}", is_correct=False, question_id=new_q.id))
    
    session.commit()
    return {"id": new_q.id, "content": new_q.content}

# --- STARE ENDPOINTY (Zostawione dla kompatybilności, jeśli ich używasz gdzie indziej) ---
@router.patch("/question/{question_id}")
def update_question_simple(
    question_id: int, 
    content: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Question).where(Question.id == question_id).options(selectinload(Question.deck))
    question = session.exec(statement).first()
    if not question or question.deck.user_id != current_user.id:
        raise HTTPException(status_code=404)
    question.content = content
    session.add(question)
    session.commit()
    return {"ok": True}