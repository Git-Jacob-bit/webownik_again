from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from database import get_session
from models import Deck, Question, Answer, QuestionRead
from parser import parse_txt_file

# Tworzymy router z prefixem /decks
# Wszystkie endpointy tutaj będą miały początek /decks
router = APIRouter(prefix="/decks", tags=["Decks"])

@router.post("/upload-form")
async def upload_deck_form(
    files: List[UploadFile] = File(...),
    deck_name: str = Form(...),
    session: Session = Depends(get_session)
):
    """Tworzy jeden zestaw z wielu plików."""
    # 1. Tworzymy zestaw
    new_deck = Deck(title=deck_name, user_id=1)
    session.add(new_deck)
    session.commit()
    session.refresh(new_deck)

    # 2. Iterujemy przez pliki
    for file in files:
        content = await file.read()
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content.decode("cp1250")

        parsed_data = parse_txt_file(text_content)
        
        if not parsed_data:
            continue

        for q_data in parsed_data:
            question = Question(content=q_data["content"], deck_id=new_deck.id)
            session.add(question)
            session.commit()
            session.refresh(question)
            
            for a_data in q_data["answers"]:
                answer = Answer(
                    content=a_data["content"], 
                    is_correct=a_data["is_correct"], 
                    question_id=question.id
                )
                session.add(answer)
    
    session.commit()
    return RedirectResponse(url="/", status_code=303)

@router.get("/{deck_id}/questions", response_model=List[QuestionRead])
def get_deck_questions(deck_id: int, session: Session = Depends(get_session)):
    """API zwracające pytania JSON-em."""
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")
    
    statement = (
        select(Question)
        .where(Question.deck_id == deck_id)
        .options(selectinload(Question.answers)) 
    )
    questions = session.exec(statement).all()
    return questions

@router.delete("/{deck_id}")
def delete_deck(deck_id: int, session: Session = Depends(get_session)):
    """Usuwa zestaw wraz z pytaniami i odpowiedziami (Ręczna kaskada)."""
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Nie znaleziono zestawu")
    
    # 1. Znajdź wszystkie pytania należące do tego zestawu
    questions = session.exec(select(Question).where(Question.deck_id == deck_id)).all()
    
    for question in questions:
        # 2. Dla każdego pytania znajdź i usuń jego odpowiedzi
        answers = session.exec(select(Answer).where(Answer.question_id == question.id)).all()
        for answer in answers:
            session.delete(answer)
        
        # 3. Usuń pytanie
        session.delete(question)
            
    # 4. Na końcu, gdy zestaw jest pusty, usuń go
    session.delete(deck)
    session.commit()
    
    return {"ok": True}