import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import Session, select
from sqlalchemy.exc import OperationalError

from database import init_db, engine
from models import User

# IMPORTUJEMY ROUTERY
from routers import frontend, decks

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
        user = session.exec(select(User).where(User.id == 1)).first()
        if not user:
            print("--- Tworzę testowego usera ---")
            test_user = User(email="test@test.pl", hashed_password="xxx", is_active=True)
            session.add(test_user)
            session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    wait_for_db()
    init_db()
    create_test_user()
    yield

app = FastAPI(title="Webownik API", lifespan=lifespan)

# PODPINAMY ROUTERY
app.include_router(frontend.router)
app.include_router(decks.router)
