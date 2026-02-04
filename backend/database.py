from sqlmodel import SQLModel, create_engine, Session
from config import settings  # <--- IMPORTUJEMY USTAWIENIA

# Tych linii już nie potrzebujesz, bo 'config.py' robi to za Ciebie:
# import os
# from dotenv import load_dotenv
# load_dotenv()
# DATABASE_URL = os.getenv("DATABASE_URL")

# Tworzymy silnik bazy, biorąc gotowy URL z naszego configu
# echo=True zostawiamy, żebyś widział zapytania SQL w logach
engine = create_engine(settings.database_url, echo=True)

def init_db():
    """Tworzy tabele w bazie danych przy starcie aplikacji"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency do wstrzykiwania sesji bazy do endpointów"""
    with Session(engine) as session:
        yield session