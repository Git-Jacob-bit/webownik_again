from sqlmodel import Session, create_engine
from config import settings  # <--- IMPORTUJEMY USTAWIENIA

# Tych linii już nie potrzebujesz, bo 'config.py' robi to za Ciebie:
# import os
# from dotenv import load_dotenv
# load_dotenv()
# DATABASE_URL = os.getenv("DATABASE_URL")

# Tworzymy silnik bazy, biorąc gotowy URL z naszego configu
# echo=True zostawiamy, żebyś widział zapytania SQL w logach
engine = create_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=10,
    pool_timeout=10,
    pool_recycle=1800,
)

def get_session():
    """Dependency do wstrzykiwania sesji bazy do endpointów"""
    with Session(engine) as session:
        yield session
