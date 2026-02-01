from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from database import get_session
from models import Deck, Question

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/")
def index(request: Request):
    # Po prostu zwracamy HTML. JavaScript w środku zajmie się resztą.
    return templates.TemplateResponse("index.html", {"request": request})

from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/")
def index(request: Request):
    """Strona główna - Dashboard użytkownika."""
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/login")
@router.get("/register")  # <-- Obie ścieżki obsługują ten sam plik
def auth_page(request: Request):
    """Serwuje połączony widok logowania i rejestracji."""
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/quiz/{deck_id}")
def quiz_page(request: Request, deck_id: int):
    """To serwuje sam PLIK HTML, a nie dane JSON."""
    return templates.TemplateResponse("quiz.html", {"request": request})

@router.get("/preview/{deck_id}")
def preview_page(request: Request, deck_id: int, session: Session = Depends(get_session)):
    # 1. Pobierz zestaw
    deck = session.get(Deck, deck_id)
    if not deck:
        return templates.TemplateResponse("404.html", {"request": request}, status_code=404)

    # 2. Pobierz pytania wraz z odpowiedziami (używamy selectinload dla wydajności)
    statement = (
        select(Question)
        .where(Question.deck_id == deck_id)
        .options(selectinload(Question.answers))
    )
    questions = session.exec(statement).all()

    # 3. Wyślij wszystko do szablonu
    return templates.TemplateResponse("preview.html", {
        "request": request, 
        "deck": deck, 
        "questions": questions
    })