from sqlmodel import SQLModel, create_engine, Session

# Używamy nazwy serwisu "db" z docker-compose jako hosta
DATABASE_URL = "postgresql://user:password@db:5432/nauka_db"

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    """Tworzy tabele w bazie danych przy starcie aplikacji"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency do wstrzykiwania sesji bazy do endpointów"""
    with Session(engine) as session:
        yield session
