from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

# --- UŻYTKOWNIK ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)

    reset_token: str | None = None
    reset_token_expiry: datetime | None = None
    
    # Relacje
    decks: List["Deck"] = Relationship(back_populates="user")
    sessions: List["QuizSession"] = Relationship(back_populates="user")

    todos: List["Todo"] = Relationship(back_populates="user")
    notes: List["Note"] = Relationship(back_populates="user")
    links: List["Link"] = Relationship(back_populates="user")

# --- ZESTAW (Talia) ---
class Deck(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    user_id: int = Field(foreign_key="user.id")
    
    # Relacje
    user: Optional[User] = Relationship(back_populates="decks")
    questions: List["Question"] = Relationship(back_populates="deck")
    sessions: List["QuizSession"] = Relationship(back_populates="deck")

# --- PYTANIE ---
class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    deck_id: int = Field(foreign_key="deck.id")
    
    # Relacje
    deck: Optional[Deck] = Relationship(back_populates="questions")
    answers: List["Answer"] = Relationship(back_populates="question")

# --- ODPOWIEDŹ ---
class Answer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    is_correct: bool = Field(default=False)
    question_id: int = Field(foreign_key="question.id")
    
    # Relacje
    question: Optional[Question] = Relationship(back_populates="answers")

# --- SESJA NAUKI (Stan gry) ---
class QuizSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    user_id: int = Field(foreign_key="user.id")
    deck_id: int = Field(foreign_key="deck.id")
    
    user: User = Relationship(back_populates="sessions")
    deck: Deck = Relationship(back_populates="sessions")
    
    # Kolejka pytań jako string "1,5,2"
    queue_str: str = "" 
    is_active: bool = True

    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_time_seconds: int = Field(default=0)  # Ile czasu już upłynęło
    last_activity: datetime = Field(default_factory=datetime.utcnow) # Kiedy ostatnio coś kliknął
    is_paused: bool = Field(default=False)      # Czy zastopował czas

# --- ZADANIE (TODO) ---
class Todo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str  # Treść zadania
    done: bool = Field(default=False)
    
    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="todos")

# --- NOTATKA ---
class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="notes")

# --- LINK (ZAKŁADKA) ---
class Link(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    url: str
    category: str = Field(default="Inne")
    
    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="links")