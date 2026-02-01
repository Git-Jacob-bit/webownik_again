import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from database import get_session
from models import QuizSession, Deck, Question, Answer, User
from routers.auth import get_current_user  # Strażnik z auth.py

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# Twoje pomocnicze funkcje (zostawiłem je w pełnej formie)
def queue_to_list(queue_str: str) -> List[int]:
    if not queue_str:
        return []
    return [int(x) for x in queue_str.split(",") if x]

def list_to_queue(queue_list: List[int]) -> str:
    return ",".join(str(x) for x in queue_list)

# --- ENDPOINTY ---

@router.get("/status/{deck_id}")
def check_quiz_status(
    deck_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # Dodano zależność
):
    """Sprawdza sesję dla zalogowanego użytkownika."""
    statement = select(QuizSession).where(
        QuizSession.user_id == current_user.id, # Zmiana z 1 na current_user
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )
    quiz_session = session.exec(statement).first()
    
    if quiz_session and len(queue_to_list(quiz_session.queue_str)) > 0:
        return {"has_active_session": True, "remaining": len(queue_to_list(quiz_session.queue_str))}
    
    return {"has_active_session": False, "remaining": 0}


@router.post("/start/{deck_id}")
def start_quiz(
    deck_id: int, 
    force_new: bool = Body(False, embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # Dodano zależność
):
    """Rozpoczyna naukę dla zalogowanego użytkownika."""
    statement = select(QuizSession).where(
        QuizSession.user_id == current_user.id, # Zmiana z 1 na current_user
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )
    existing_session = session.exec(statement).first()

    if existing_session and not force_new:
        return {"message": "Session continued", "session_id": existing_session.id}

    if existing_session and force_new:
        session.delete(existing_session)
        session.commit()

    questions = session.exec(select(Question.id).where(Question.deck_id == deck_id)).all()
    if not questions:
        raise HTTPException(status_code=400, detail="Zestaw jest pusty!")

    # TWÓJ ALGORYTM: Każde pytanie 2 razy, wymieszane
    queue = questions * 2
    random.shuffle(queue)

    new_session = QuizSession(
        user_id=current_user.id, # Zmiana z 1 na current_user
        deck_id=deck_id,
        queue_str=list_to_queue(queue),
        is_active=True
    )
    session.add(new_session)
    session.commit()
    
    return {"message": "New session started", "session_id": new_session.id, "total_questions": len(queue)}


@router.get("/next/{deck_id}")
def get_next_question(
    deck_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user) # Dodano zależność
):
    """Pobiera kolejne pytanie dla zalogowanego użytkownika."""
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id, # Zmiana z 1 na current_user
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Brak aktywnej sesji.")

    queue = queue_to_list(db_session.queue_str)
    
    if not queue:
        return {"finished": True}

    next_q_id = queue[0]
    
    # Ładujemy dane pytania wraz z odpowiedziami
    statement = select(Question).where(Question.id == next_q_id).options(selectinload(Question.answers))
    question = session.exec(statement).first()

    return {
        "finished": False,
        "remaining": len(queue),
        "question": {
            "id": question.id,
            "content": question.content,
            "answers": [{"id": a.id, "content": a.content} for a in question.answers]
        }
    }


@router.post("/answer/{deck_id}")
def submit_answer(
    deck_id: int, 
    answer_ids: List[int] = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Weryfikuje listę odpowiedzi i aktualizuje kolejkę użytkownika."""
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True # Ważne, żeby brać aktywną sesję
    )).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje")

    queue = queue_to_list(db_session.queue_str)
    if not queue:
        return {"finished": True}

    current_q_id = queue[0] 
    
    # 1. Pobierz poprawne odpowiedzi z bazy
    correct_answers_db = session.exec(
        select(Answer.id).where(Answer.question_id == current_q_id, Answer.is_correct == True)
    ).all()
    
    correct_ids_set = set(correct_answers_db)
    user_ids_set = set(answer_ids)

    is_fully_correct = (user_ids_set == correct_ids_set)

    # 2. AKTUALIZACJA KOLEJKI
    queue.pop(0) 

    if not is_fully_correct:
        # Błąd -> wraca do kolejki (losowo między 3 a 6 pozycją)
        insert_index = random.randint(3, 6)
        if insert_index > len(queue):
            queue.append(current_q_id)
        else:
            queue.insert(insert_index, current_q_id)

    # 3. KLUCZOWA ZMIANA: Obsługa końca sesji
    is_finished = len(queue) == 0

    if is_finished:
        # Usuwamy sesję z bazy, aby przy następnym razie zacząć od nowa
        session.delete(db_session)
    else:
        # Jeśli nie koniec, aktualizujemy kolejkę w bazie
        db_session.queue_str = list_to_queue(queue)
        session.add(db_session)
    
    session.commit()

    return {
        "is_correct": is_fully_correct,
        "remaining": len(queue),
        "correct_ids": list(correct_ids_set),
        "finished": is_finished  # <--- Ta informacja jest niezbędna dla frontendu!
    }