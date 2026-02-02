from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

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