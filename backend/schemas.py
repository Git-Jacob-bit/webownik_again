from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime  # <--- DODAJ TĘ LINIJKĘ

# --- WALIDACJA REJESTRACJI ---
class UserCreate(BaseModel):
    email: EmailStr  # Automatycznie sprawdzi poprawność adresu
    password: str = Field(min_length=8, description="Hasło musi mieć min. 8 znaków")

# --- WALIDACJA ODPOWIEDZI (PRZY EDYCJI) ---
class AnswerUpdate(BaseModel):
    id: int
    content: str = Field(min_length=1, description="Odpowiedź nie może być pusta")
    is_correct: bool

# --- WALIDACJA PYTANIA (PRZY EDYCJI) ---
class QuestionUpdate(BaseModel):
    content: str = Field(min_length=3, description="Treść pytania min. 3 znaki")
    answers: List[AnswerUpdate]

# ... (twoje inne importy)

# --- TWORZENIE PYTANIA ---
class QuestionCreate(BaseModel):
    content: str = Field(min_length=3, description="Treść pytania min. 3 znaki")
    # Nie musimy podawać odpowiedzi przy tworzeniu, bo backend sam dodaje 4 puste

# ... (Poprzednie klasy UserCreate, QuestionCreate itd. zostają) ...

# --- SCHEMATY TODO ---
class TodoCreate(BaseModel):
    text: str
    done: bool = False

class TodoRead(TodoCreate):
    id: int
    user_id: int

# --- SCHEMATY NOTATEK ---
class NoteCreate(BaseModel):
    title: str
    content: str

class NoteRead(NoteCreate):
    id: int
    user_id: int
    created_at: datetime

# --- SCHEMATY LINKÓW ---
class LinkCreate(BaseModel):
    title: str
    url: str
    category: str = "Inne"

class LinkRead(LinkCreate):
    id: int
    user_id: int


# --- SCHEMATY DO ODCZYTU ZESTAWÓW (Deck -> Question -> Answer) ---

# 1. Pojedyncza odpowiedź (do wyświetlania)
class AnswerRead(BaseModel):
    id: int
    content: str
    is_correct: bool

# 2. Pytanie z listą odpowiedzi
class QuestionRead(BaseModel):
    id: int
    content: str
    answers: List[AnswerRead] = []

# 3. Zestaw z listą pytań (Tego użyjemy w routerze)
class DeckWithQuestions(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    questions: List[QuestionRead] = []

# --- ZMIANA HASŁA ---
class UserPasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=4, description="Nowe hasło musi mieć min. 4 znaki")

class UserRead(BaseModel):
    id: int
    email: EmailStr