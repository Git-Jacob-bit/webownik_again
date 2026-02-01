import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from database import get_session
from models import QuizSession, Deck, Question, Answer

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# Pomocnicze funkcje do obsługi kolejki zapisanej jako string "1,2,3"
def queue_to_list(queue_str: str) -> List[int]:
    if not queue_str:
        return []
    return [int(x) for x in queue_str.split(",") if x]

def list_to_queue(queue_list: List[int]) -> str:
    return ",".join(str(x) for x in queue_list)

# --- ENDPOINTY ---

@router.get("/status/{deck_id}")
def check_quiz_status(deck_id: int, session: Session = Depends(get_session)):
    """Sprawdza, czy mamy zapisaną sesję dla tego zestawu."""
    # Szukamy aktywnej sesji dla usera ID=1 (hardcoded na razie)
    statement = select(QuizSession).where(
        QuizSession.user_id == 1,
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
    force_new: bool = Body(False, embed=True), # Czy wymusić nową grę?
    session: Session = Depends(get_session)
):
    """Rozpoczyna naukę. Tworzy kolejkę pytań (każde x2)."""
    
    # 1. Sprawdź czy jest stara sesja
    statement = select(QuizSession).where(
        QuizSession.user_id == 1,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )
    existing_session = session.exec(statement).first()

    # Jeśli jest sesja i NIE chcemy nowej -> nic nie rób, zwracamy OK
    if existing_session and not force_new:
        return {"message": "Session continued", "session_id": existing_session.id}

    # Jeśli chcemy nową, a stara istnieje -> usuń starą
    if existing_session and force_new:
        session.delete(existing_session)
        session.commit()

    # 2. Pobierz ID wszystkich pytań z zestawu
    questions = session.exec(select(Question.id).where(Question.deck_id == deck_id)).all()
    if not questions:
        raise HTTPException(status_code=400, detail="Zestaw jest pusty!")

    # 3. ALGORYTM: Każde pytanie 2 razy, wymieszane
    queue = questions * 2  # [1,2] -> [1,2,1,2]
    random.shuffle(queue)  # Mieszamy

    # 4. Zapisz nową sesję
    new_session = QuizSession(
        user_id=1,
        deck_id=deck_id,
        queue_str=list_to_queue(queue),
        is_active=True
    )
    session.add(new_session)
    session.commit()
    
    return {"message": "New session started", "session_id": new_session.id, "total_questions": len(queue)}


@router.get("/next/{deck_id}")
def get_next_question(deck_id: int, session: Session = Depends(get_session)):
    """Pobiera kolejne pytanie z kolejki (nie usuwa go jeszcze)."""
    # Pobierz sesję
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == 1, 
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True
    )).first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Brak aktywnej sesji. Rozpocznij quiz.")

    queue = queue_to_list(db_session.queue_str)
    
    if not queue:
        return {"finished": True}

    # Pobierz ID pierwszego pytania z brzegu
    next_q_id = queue[0]
    
    # Pobierz pełne dane pytania z bazy
    question = session.get(Question, next_q_id)
    
    # Ładujemy odpowiedzi
    statement = select(Question).where(Question.id == next_q_id).options(selectinload(Question.answers))
    question = session.exec(statement).first()

    return {
        "finished": False,
        "remaining": len(queue),
        "question": {
            "id": question.id,
            "content": question.content,
            "answers": [{"id": a.id, "content": a.content} for a in question.answers] # Nie wysyłamy is_correct!
        }
    }


@router.post("/answer/{deck_id}")
def submit_answer(
    deck_id: int, 
    answer_ids: List[int] = Body(..., embed=True), # Teraz przyjmujemy listę!
    session: Session = Depends(get_session)
):
    """Weryfikuje listę odpowiedzi (Multi-select)."""
    
    # 1. Pobierz sesję
    db_session = session.exec(select(QuizSession).where(
        QuizSession.user_id == 1, 
        QuizSession.deck_id == deck_id
    )).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje")

    queue = queue_to_list(db_session.queue_str)
    if not queue:
        return {"finished": True}

    current_q_id = queue[0] 
    
    # 2. Pobierz wszystkie poprawne odpowiedzi dla tego pytania z bazy
    # Musimy wiedzieć, jakie SĄ poprawne, żeby porównać z tym co wysłał user
    correct_answers_db = session.exec(
        select(Answer.id).where(Answer.question_id == current_q_id, Answer.is_correct == True)
    ).all()
    
    correct_ids_set = set(correct_answers_db)      # To co powinno być zaznaczone
    user_ids_set = set(answer_ids)                 # To co user zaznaczył

    # 3. SPRAWDZENIE: Czy zbiory są identyczne?
    # User musi zaznaczyć WSZYSTKIE poprawne i ŻADNEJ błędnej.
    is_fully_correct = (user_ids_set == correct_ids_set)

    # 4. AKTUALIZACJA KOLEJKI
    queue.pop(0) # Usuwamy obecne

    if is_fully_correct:
        # Brawo, znika (lub czeka na drugie wystąpienie jeśli jest dalej w kolejce)
        pass 
    else:
        # Błąd -> wraca do kolejki
        insert_index = random.randint(3, 6)
        if insert_index > len(queue):
            queue.append(current_q_id)
        else:
            queue.insert(insert_index, current_q_id)

    # Zapisz zmiany
    db_session.queue_str = list_to_queue(queue)
    if not queue:
        db_session.is_active = False
        
    session.add(db_session)
    session.commit()

    return {
        "is_correct": is_fully_correct,
        "remaining": len(queue),
        "correct_ids": list(correct_ids_set) # Zwracamy listę poprawnych ID, żeby frontend mógł pokolorować
    }