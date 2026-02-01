from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlmodel import Session, select
from contextlib import asynccontextmanager
import time
from sqlalchemy.exc import OperationalError
from database import init_db, engine, get_session # Dodaj get_session!
from models import User, Deck, Question, Answer
from parser import parse_txt_file # Importujemy nasz nowy parser

# Importujemy nasze moduły
from database import init_db, engine
# Importujemy modele, żeby SQLModel wiedział co utworzyć
from models import User, Deck, Question, Answer

# Funkcja Retry - czeka na bazę danych przy starcie
def wait_for_db():
    retries = 5
    while retries > 0:
        try:
            # Próbujemy połączyć się z bazą
            with engine.connect() as conn:
                conn.execute(select(1))
            print("--- Baza danych gotowa! ---")
            return
        except OperationalError:
            print(f"--- Baza jeszcze śpi... czekam (pozostało prób: {retries}) ---")
            time.sleep(2)
            retries -= 1
    print("--- Nie udało się połączyć z bazą ---")

def create_test_user():
    """Tworzy testowego użytkownika, jeśli nie istnieje"""
    with Session(engine) as session:
        user = session.exec(select(User).where(User.id == 1)).first()
        if not user:
            print("--- Tworzę testowego usera (ID: 1) ---")
            test_user = User(email="test@test.pl", hashed_password="hashed_secret", is_active=True)
            session.add(test_user)
            session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Kod wykonywany przy starcie (STARTUP)
    wait_for_db()
    init_db()
    create_test_user()
    yield
    # Kod wykonywany przy zamknięciu (SHUTDOWN)
    pass

app = FastAPI(
    title="Webownik API",
    lifespan=lifespan
)

@app.get("/")
def read_root():
    return {"message": "Witaj w Webowniku! API działa."}

@app.post("/decks/upload")
async def upload_deck(
    file: UploadFile = File(...), 
    session: Session = Depends(get_session)
):
    """
    Tworzy nowy zestaw (Deck) z przesłanego pliku .txt
    UWAGA: Na razie przypisujemy wszystko do usera o ID 1 (hardcoded), 
    bo nie mamy jeszcze logowania.
    """
    
    # 1. Odczytujemy zawartość pliku
    content = await file.read()
    try:
        # Dekodujemy bajty na string (polskie znaki utf-8 lub windows-1250)
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        # Fallback dla starych plików Windowsowych
        text_content = content.decode("cp1250")

    # 2. Parsujemy plik
    parsed_data = parse_txt_file(text_content)
    
    if not parsed_data:
        raise HTTPException(status_code=400, detail="Nie znaleziono pytań w pliku")

    # 3. Tworzymy Zestaw (Deck)
    # TODO: Zmienić user_id=1 na dynamiczne z tokena JWT (w przyszłości)
    new_deck = Deck(title=file.filename, user_id=1)
    session.add(new_deck)
    session.commit()
    session.refresh(new_deck)

    # 4. Zapisujemy Pytania i Odpowiedzi
    count_questions = 0
    
    for q_data in parsed_data:
        # Tworzymy pytanie
        question = Question(content=q_data["content"], deck_id=new_deck.id)
        session.add(question)
        session.commit()
        session.refresh(question)
        
        # Tworzymy odpowiedzi do tego pytania
        for a_data in q_data["answers"]:
            answer = Answer(
                content=a_data["content"],
                is_correct=a_data["is_correct"],
                question_id=question.id
            )
            session.add(answer)
        
        count_questions += 1

    session.commit()
    
    return {
        "message": "Pomyślnie zaimportowano zestaw",
        "deck_id": new_deck.id,
        "questions_count": count_questions
    }
