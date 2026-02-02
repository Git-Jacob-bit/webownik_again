import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from datetime import datetime

from database import get_session
from models import QuizSession, Question, Answer, User
from routers.auth import get_current_user

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# --- FUNKCJE POMOCNICZE ---
def queue_to_list(queue_str: str) -> List[int]:
    if not queue_str:
        return []
    return [int(x) for x in queue_str.split(",") if x]

def list_to_queue(queue_list: List[int]) -> str:
    return ",".join(str(x) for x in queue_list)

def update_session_time(session: QuizSession):
    """Oblicza czas od ostatniej aktywności i dodaje do licznika, jeśli nie było pauzy."""
    if not session.is_paused:
        now = datetime.utcnow()
        # Obliczamy różnicę w sekundach
        if session.last_activity:
            delta = (now - session.last_activity).total_seconds()
            session.total_time_seconds += int(delta)
        # Aktualizujemy znacznik czasu na "teraz"
        session.last_activity = now

# --- STATUS SESJI ---
@router.get("/status/{deck_id}")
def check_quiz_status(
    deck_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )
    quiz_session = session.exec(statement).first()
    
    if quiz_session and len(queue_to_list(quiz_session.queue_str)) > 0:
        return {
            "has_active_session": True, 
            "remaining": len(queue_to_list(quiz_session.queue_str)),
            "time_spent": quiz_session.total_time_seconds
        }
    
    return {"has_active_session": False, "remaining": 0, "time_spent": 0}

# --- START NOWEJ SESJI ---
@router.post("/start/{deck_id}")
def start_quiz(
    deck_id: int, 
    force_new: bool = Body(False, embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Sprawdź czy jest stara sesja
    statement = select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )
    existing_session = session.exec(statement).first()

    # KONTYNUACJA SESJI
    if existing_session and not force_new:
        # Wznawiamy licznik czasu (resetujemy last_activity, żeby nie doliczył czasu przerwy)
        existing_session.last_activity = datetime.utcnow()
        existing_session.is_paused = False
        session.add(existing_session)
        session.commit()
        return {
            "message": "Session continued", 
            "session_id": existing_session.id,
            "time_spent": existing_session.total_time_seconds
        }

    # USUWANIE STAREJ SESJI
    if existing_session and force_new:
        session.delete(existing_session)
        session.commit()

    # 2. Pobierz pytania do nowej gry
    questions = session.exec(select(Question.id).where(Question.deck_id == deck_id)).all()
    if not questions:
        raise HTTPException(status_code=400, detail="Zestaw jest pusty!")

    # ALGORYTM: Każde pytanie 2 razy, wymieszane
    queue = questions * 2
    random.shuffle(queue)

    # NOWA SESJA (startuje licznik)
    new_session = QuizSession(
        user_id=current_user.id,
        deck_id=deck_id,
        queue_str=list_to_queue(queue),
        is_active=True,
        total_time_seconds=0,            # Start od 0
        last_activity=datetime.utcnow(), # Czas startu
        is_paused=False
    )
    session.add(new_session)
    session.commit()
    
    return {"message": "New session started", "session_id": new_session.id, "total_questions": len(queue)}

# --- PAUZA ---
@router.post("/pause/{deck_id}")
def pause_quiz(
    deck_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Brak sesji")

    # Zlicz czas do momentu kliknięcia pauzy
    update_session_time(db_session)
    
    # Ustaw flagę pauzy
    db_session.is_paused = True
    session.add(db_session)
    session.commit()
    
    return {"status": "paused", "total_time": db_session.total_time_seconds}

# --- WZNOWIENIE ---
@router.post("/resume/{deck_id}")
def resume_quiz(
    deck_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Brak sesji")

    # Resetujemy znacznik czasu na "teraz", żeby nie doliczył czasu bycia na pauzie
    db_session.last_activity = datetime.utcnow()
    db_session.is_paused = False
    
    session.add(db_session)
    session.commit()
    
    return {"status": "resumed"}

# --- POBIERZ NASTĘPNE PYTANIE ---
@router.get("/next/{deck_id}")
def get_next_question(
    deck_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Brak aktywnej sesji.")

    queue = queue_to_list(db_session.queue_str)
    
    if not queue:
        return {"finished": True}

    next_q_id = queue[0]
    
    # Pobieramy pytanie wraz z odpowiedziami
    statement = select(Question).where(Question.id == next_q_id).options(selectinload(Question.answers))
    question = session.exec(statement).first()

    # MIESZANIE ODPOWIEDZI (FRONTEND DOSTAJE LOSOWO)
    answers_list = [{"id": a.id, "content": a.content} for a in question.answers]
    random.shuffle(answers_list)

    return {
        "finished": False,
        "remaining": len(queue),
        "question": {
            "id": question.id,
            "content": question.content,
            "answers": answers_list
        }
    }

# --- ZATWIERDŹ ODPOWIEDŹ ---
@router.post("/answer/{deck_id}")
def submit_answer(
    deck_id: int, 
    answer_ids: List[int] = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje")

    # --- AKTUALIZACJA CZASU ---
    update_session_time(db_session)
    # --------------------------

    queue = queue_to_list(db_session.queue_str)
    if not queue:
        return {"finished": True}

    current_q_id = queue[0] 
    
    # 1. Sprawdź poprawność
    correct_answers_db = session.exec(
        select(Answer.id).where(Answer.question_id == current_q_id, Answer.is_correct == True)
    ).all()
    
    correct_ids_set = set(correct_answers_db)
    user_ids_set = set(answer_ids)
    is_fully_correct = (user_ids_set == correct_ids_set)

    # 2. Aktualizuj kolejkę
    queue.pop(0) 

    if not is_fully_correct:
        # Błąd -> wraca do kolejki (losowo między 3 a 6 pozycją)
        insert_index = random.randint(3, 6)
        if insert_index > len(queue):
            queue.append(current_q_id)
        else:
            queue.insert(insert_index, current_q_id)

    # 3. Sprawdź czy koniec
    is_finished = len(queue) == 0

    if is_finished:
        # Tu możesz zapisać ostateczny czas do innej tabeli ze statystykami
        final_time = db_session.total_time_seconds
        session.delete(db_session)
    else:
        db_session.queue_str = list_to_queue(queue)
        final_time = db_session.total_time_seconds
        session.add(db_session)
    
    session.commit()

    return {
        "is_correct": is_fully_correct,
        "remaining": len(queue),
        "correct_ids": list(correct_ids_set),
        "finished": is_finished,
        "time_spent": final_time  # Zwracamy czas, żeby frontend mógł go wyświetlić
    }