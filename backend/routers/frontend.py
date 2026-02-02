from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from fastapi.responses import HTMLResponse  # <--- DODAJ TĘ LINIĘ

from database import get_session
from models import Deck, Question

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# --- STRONA GŁÓWNA ---
@router.get("/")
def index(request: Request):
    """Strona główna - Dashboard użytkownika."""
    return templates.TemplateResponse("index.html", {"request": request})

# --- LOGOWANIE I REJESTRACJA ---
@router.get("/login")
@router.get("/register")
def auth_page(request: Request):
    """Serwuje połączony widok logowania i rejestracji."""
    return templates.TemplateResponse("login.html", {"request": request})

# --- QUIZ (ROZGRYWKA) ---
@router.get("/quiz/{deck_id}")
def quiz_page(request: Request, deck_id: int):
    """Serwuje plik HTML quizu (logika jest w JavaScript)."""
    return templates.TemplateResponse("quiz.html", {"request": request})

# --- PODGLĄD / EDYCJA ZESTAWU ---
@router.get("/preview/{deck_id}")
def preview_page(request: Request, deck_id: int, session: Session = Depends(get_session)):
    # 1. Pobierz zestaw
    deck = session.get(Deck, deck_id)
    if not deck:
        return templates.TemplateResponse("404.html", {"request": request}, status_code=404)

    # 2. Pobierz pytania (posortowane, żeby nie skakały)
    statement = (
        select(Question)
        .where(Question.deck_id == deck_id)
        .options(selectinload(Question.answers))
        .order_by(Question.id)
    )
    questions = session.exec(statement).all()

    # 3. Wyślij do szablonu
    return templates.TemplateResponse("preview.html", {
        "request": request, 
        "deck": deck, 
        "questions": questions
    })

# Dodaj to do routera obsługującego strony (frontend)
@router.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})