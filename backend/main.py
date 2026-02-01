import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import Session, select
from sqlalchemy.exc import OperationalError
from fastapi.staticfiles import StaticFiles

from security import get_password_hash
from database import init_db, engine
from models import User

# IMPORTUJEMY ROUTERY
from routers import auth, frontend, decks, quiz

def wait_for_db():
    retries = 5
    while retries > 0:
        try:
            with engine.connect() as conn:
                conn.execute(select(1))
            print("--- Baza danych gotowa! ---")
            return
        except OperationalError:
            print(f"--- Baza jeszcze śpi... czekam ({retries}) ---")
            time.sleep(2)
            retries -= 1
    print("--- Nie udało się połączyć z bazą ---")

def create_test_user():
    with Session(engine) as session:
        # Szukamy usera ID=1 (albo po emailu)
        user = session.exec(select(User).where(User.email == "test@test.pl")).first()
        if not user:
            print("--- Tworzę testowego usera (admina) ---")
            
            # Tworzymy prawdziwy hash dla hasła "admin123"
            secure_password = get_password_hash("admin123")
            
            test_user = User(
                email="test@test.pl", 
                hashed_password=secure_password, # Tu wstawiamy hash, nie zwykły tekst!
                is_active=True
            )
            session.add(test_user)
            session.commit()
            print("--- Gotowe! Login: test@test.pl, Hasło: admin123 ---")

@asynccontextmanager
async def lifespan(app: FastAPI):
    wait_for_db()
    init_db()
    create_test_user()
    yield

app = FastAPI(title="Webownik API", lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")
# PODPINAMY ROUTERY
app.include_router(auth.router)
app.include_router(frontend.router)
app.include_router(decks.router)
app.include_router(quiz.router)
