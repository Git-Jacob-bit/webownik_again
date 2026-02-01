from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

# --- Modele Danych (Tabele) ---

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    
    # Relacje
    decks: List["Deck"] = Relationship(back_populates="user")
    sessions: List["QuizSession"] = Relationship(back_populates="user") # <--- NOWE

class Deck(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    # Każdy zestaw musi mieć właściciela (nawet jeśli to admin o ID=1)
    user_id: int = Field(foreign_key="user.id")
    
    # Relacje
    user: Optional[User] = Relationship(back_populates="decks")
    questions: List["Question"] = Relationship(back_populates="deck")
    sessions: List["QuizSession"] = Relationship(back_populates="deck") # <--- NOWE

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    deck_id: int = Field(foreign_key="deck.id")
    
    # Relacje
    deck: Optional[Deck] = Relationship(back_populates="questions")
    answers: List["Answer"] = Relationship(back_populates="question")

class Answer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    is_correct: bool = Field(default=False)
    question_id: int = Field(foreign_key="question.id")
    
    # Relacje
    question: Optional[Question] = Relationship(back_populates="answers")

# --- Schematy do odczytu (Pydantic models) ---
# Przydatne przy zwracaniu danych do API

class AnswerRead(SQLModel):
    id: int
    content: str
    is_correct: bool

class QuestionRead(SQLModel):
    id: int
    content: str
    answers: List[AnswerRead] = []

# --- SESJA NAUKI (Stan gry) ---
class QuizSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Klucze obce (Foreign Keys) - to łączy tabele w bazie
    user_id: int = Field(foreign_key="user.id")
    deck_id: int = Field(foreign_key="deck.id")
    
    # Relacje obiektowe - to pozwala w kodzie pisać session.user.email
    user: User = Relationship(back_populates="sessions")
    deck: Deck = Relationship(back_populates="sessions")
    
    # Kolejka pytań "1,5,2"
    queue_str: str = "" 
    is_active: bool = True