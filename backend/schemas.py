from typing import List, Optional
from pydantic import AnyHttpUrl, BaseModel, EmailStr, Field
from datetime import datetime  # <--- DODAJ TĘ LINIJKĘ
from uuid import UUID
from limits import (
    MAX_ANSWERS_PER_QUESTION, MAX_ANSWER_LENGTH, MAX_LINK_CATEGORY_LENGTH,
    MAX_LINK_TITLE_LENGTH, MAX_LINK_URL_LENGTH, MAX_NOTE_CONTENT_LENGTH,
    MAX_NOTE_TITLE_LENGTH, MAX_QUESTION_LENGTH, MAX_TODO_LENGTH,
)

# --- WALIDACJA REJESTRACJI ---
class UserCreate(BaseModel):
    email: EmailStr  # Automatycznie sprawdzi poprawność adresu
    password: str = Field(min_length=8, max_length=128, description="Hasło musi mieć min. 8 znaków")
    turnstile_token: str | None = Field(default=None, max_length=4096)

# --- WALIDACJA ODPOWIEDZI (PRZY EDYCJI) ---
class AnswerUpdate(BaseModel):
    id: int
    content: str = Field(min_length=1, max_length=MAX_ANSWER_LENGTH, description="Odpowiedź nie może być pusta")
    is_correct: bool

# --- WALIDACJA PYTANIA (PRZY EDYCJI) ---
class QuestionUpdate(BaseModel):
    content: str = Field(min_length=3, max_length=MAX_QUESTION_LENGTH, description="Treść pytania min. 3 znaki")
    answers: List[AnswerUpdate] = Field(min_length=1, max_length=MAX_ANSWERS_PER_QUESTION)

# ... (twoje inne importy)

# --- TWORZENIE PYTANIA ---
class QuestionCreate(BaseModel):
    content: str = Field(min_length=3, max_length=MAX_QUESTION_LENGTH, description="Treść pytania min. 3 znaki")
    # Nie musimy podawać odpowiedzi przy tworzeniu, bo backend sam dodaje 4 puste

# ... (Poprzednie klasy UserCreate, QuestionCreate itd. zostają) ...

# --- SCHEMATY TODO ---
class TodoCreate(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TODO_LENGTH)
    done: bool = False

class TodoRead(TodoCreate):
    id: int
    user_id: UUID

# --- SCHEMATY NOTATEK ---
class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_NOTE_TITLE_LENGTH)
    content: str = Field(max_length=MAX_NOTE_CONTENT_LENGTH)

class NoteRead(NoteCreate):
    id: int
    user_id: UUID
    created_at: datetime

# --- SCHEMATY LINKÓW ---
class LinkCreate(BaseModel):
    title: str = Field(min_length=1, max_length=MAX_LINK_TITLE_LENGTH)
    url: AnyHttpUrl = Field(max_length=MAX_LINK_URL_LENGTH)
    category: str = Field(default="Inne", min_length=1, max_length=MAX_LINK_CATEGORY_LENGTH)

class LinkRead(LinkCreate):
    url: str
    id: int
    user_id: UUID


# --- SCHEMATY DO ODCZYTU ZESTAWÓW (Deck -> Question -> Answer) ---

# 1. Pojedyncza odpowiedź (do wyświetlania)
class AnswerRead(BaseModel):
    id: int
    content: str
    content_en: Optional[str] = None
    is_correct: bool

# 2. Pytanie z listą odpowiedzi
class QuestionRead(BaseModel):
    id: int
    content: str
    content_en: Optional[str] = None
    answers: List[AnswerRead] = []

# 3. Zestaw z listą pytań (Tego użyjemy w routerze)
class DeckWithQuestions(BaseModel):
    id: int
    title: str
    title_en: Optional[str] = None
    translation_status: str = "pending"
    translation_completed: int = 0
    translation_total: int = 0
    description: Optional[str] = None
    questions: List[QuestionRead] = []

# --- ZMIANA HASŁA ---
class UserPasswordChange(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128, description="Nowe hasło musi mieć min. 8 znaków")

class UserRead(BaseModel):
    id: UUID
    email: EmailStr
