import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

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
        return {"has_active_session": True, "remaining": len(queue_to_list(quiz_session.queue_str))}
    
    return {"has_active_session": False, "remaining": 0}

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

    if existing_session and not force_new:
        return {"message": "Session continued", "session_id": existing_session.id}

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

    new_session = QuizSession(
        user_id=current_user.id,
        deck_id=deck_id,
        queue_str=list_to_queue(queue),
        is_active=True
    )
    session.add(new_session)
    session.commit()
    
    return {"message": "New session started", "session_id": new_session.id, "total_questions": len(queue)}

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
        session.delete(db_session)
    else:
        db_session.queue_str = list_to_queue(queue)
        session.add(db_session)
    
    session.commit()

    return {
        "is_correct": is_fully_correct,
        "remaining": len(queue),
        "correct_ids": list(correct_ids_set),
        "finished": is_finished
    }