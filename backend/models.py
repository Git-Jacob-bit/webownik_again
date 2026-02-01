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

class Deck(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    user_id: int = Field(foreign_key="user.id")
    
    # Relacje
    user: Optional[User] = Relationship(back_populates="decks")
    questions: List["Question"] = Relationship(back_populates="deck")

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str  # Treść pytania
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
