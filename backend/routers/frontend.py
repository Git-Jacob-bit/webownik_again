from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from database import get_session
from models import Deck, Question

# Tworzymy router
router = APIRouter()

# Konfiguracja szablonów (musimy podać ścieżkę względem głównego folderu backendu)
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
def read_root(request: Request, session: Session = Depends(get_session)):
    """Strona główna - wyświetla listę zestawów."""
    decks = session.exec(select(Deck)).all()
    return templates.TemplateResponse(
        "index.html", 
        {"request": request, "decks": decks}
    )

@router.get("/nauka/{deck_id}", response_class=HTMLResponse)
def study_view(deck_id: int, request: Request, session: Session = Depends(get_session)):
    """Widok HTML (frontend) dla quizu."""
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")
        
    return templates.TemplateResponse(
        "quiz.html", 
        {"request": request, "deck_id": deck_id}
    )

@router.get("/preview/{deck_id}", response_class=HTMLResponse)
def preview_deck(deck_id: int, request: Request, session: Session = Depends(get_session)):
    """Wyświetla wszystkie pytania z danego zestawu."""
    # Pobieramy deck wraz z pytaniami
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")
    
    # Pobieramy pytania oddzielnym zapytaniem dla pewności (z odpowiedziami)
    statement = (
        select(Question)
        .where(Question.deck_id == deck_id)
        .options(selectinload(Question.answers))
    )
    questions = session.exec(statement).all()

    return templates.TemplateResponse(
        "preview.html", 
        {"request": request, "deck": deck, "questions": questions}
    )

# ... (poprzednie importy)

@router.get("/quiz-ui/{deck_id}")
def quiz_page(deck_id: int):
    """Zwraca stronę HTML quizu."""
    return FileResponse("templates/quiz.html")