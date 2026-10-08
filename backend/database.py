from sqlmodel import Session, create_engine

from config import settings

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
