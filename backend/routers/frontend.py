from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from database import get_session
from models import Deck

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
