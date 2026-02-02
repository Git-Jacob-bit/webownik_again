import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

# 1. Załaduj zmienne z pliku .env
load_dotenv()

# 2. Pobierz adres z ukrytej zmiennej
DATABASE_URL = os.getenv("DATABASE_URL")

# Zabezpieczenie: Jeśli zapomnisz o pliku .env, program krzyknie błędem od razu
if not DATABASE_URL:
    raise ValueError("Brak DATABASE_URL w pliku .env! Ustaw zmienne środowiskowe.")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    """Tworzy tabele w bazie danych przy starcie aplikacji"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency do wstrzykiwania sesji bazy do endpointów"""
    with Session(engine) as session:
        yield session