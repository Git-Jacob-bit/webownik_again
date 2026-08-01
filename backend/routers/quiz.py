import json
import random
from datetime import datetime
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from database import get_session
from models import Answer, Deck, Question, QuizSession, User
from routers.auth import get_current_user

router = APIRouter(prefix="/quiz", tags=["Quiz"])
REQUIRED_CORRECT_STREAK = 2


def queue_to_list(queue_str: str) -> List[int]:
    if not queue_str:
        return []
    return [int(value) for value in queue_str.split(",") if value]


def list_to_queue(queue: List[int]) -> str:
    return ",".join(str(value) for value in queue)


def load_stats(quiz_session: QuizSession) -> dict:
    try:
        value = json.loads(quiz_session.question_stats_json or "{}")
        return value if isinstance(value, dict) else {}
    except (TypeError, ValueError):
        return {}


def save_stats(quiz_session: QuizSession, stats: dict) -> None:
    quiz_session.question_stats_json = json.dumps(stats, separators=(",", ":"))


def ensure_progress_state(quiz_session: QuizSession) -> bool:
    """Konwertuje aktywną sesję ze starego formatu bez utraty pozostałych pytań."""
    stats = load_stats(quiz_session)
    if quiz_session.initial_question_count > 0 and stats:
        return False
    unique_queue = list(dict.fromkeys(queue_to_list(quiz_session.queue_str)))
    quiz_session.initial_question_count = len(unique_queue)
    quiz_session.queue_str = list_to_queue(unique_queue)
    save_stats(quiz_session, {
        str(question_id): {"streak": 0, "correct": 0, "incorrect": 0, "mastered": False}
        for question_id in unique_queue
    })
    return True


def update_session_time(quiz_session: QuizSession) -> None:
    now = datetime.utcnow()
    if not quiz_session.is_paused and quiz_session.last_activity:
        delta = max(0, int((now - quiz_session.last_activity).total_seconds()))
        quiz_session.total_time_seconds += delta
    quiz_session.last_activity = now


def progress_payload(quiz_session: QuizSession) -> dict:
    stats = load_stats(quiz_session)
    mastered = sum(bool(item.get("mastered")) for item in stats.values())
    struggling = sum(item.get("incorrect", 0) > 0 and not item.get("mastered") for item in stats.values())
    initial = quiz_session.initial_question_count or len(stats)
    return {
        "initial_questions": initial,
        "mastered_questions": mastered,
        "learning_questions": max(0, initial - mastered),
        "struggling_questions": struggling,
        "remaining": len(queue_to_list(quiz_session.queue_str)),
        "total_answers": quiz_session.total_answers,
        "correct_answers": quiz_session.correct_answers,
        "incorrect_answers": quiz_session.incorrect_answers,
        "time_spent": quiz_session.total_time_seconds,
        "is_paused": quiz_session.is_paused,
    }


def summary_payload(quiz_session: QuizSession, db: Session) -> dict:
    result = progress_payload(quiz_session)
    stats = load_stats(quiz_session)
    difficult = sorted(
        ((int(question_id), item) for question_id, item in stats.items() if item.get("incorrect", 0) > 0),
        key=lambda pair: (-pair[1].get("incorrect", 0), pair[0]),
    )[:5]
    question_ids = [question_id for question_id, _ in difficult]
    question_rows = db.exec(select(Question).where(Question.id.in_(question_ids))).all() if question_ids else []
    contents = {question.id: question.content for question in question_rows}
    result["difficult_questions"] = [
        {
            "id": question_id,
            "content": contents.get(question_id, f"Pytanie #{question_id}"),
            "incorrect": item.get("incorrect", 0),
            "correct": item.get("correct", 0),
        }
        for question_id, item in difficult
    ]
    return result


def get_active_session(db: Session, user_id, deck_id: int, lock: bool = False):
    statement = select(QuizSession).where(
        QuizSession.user_id == user_id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == True,
    ).order_by(QuizSession.id.desc())
    if lock:
        statement = statement.with_for_update()
    return db.exec(statement).first()


def schedule_later(queue: list[int], question_id: int) -> None:
    if not queue:
        queue.append(question_id)
        return
    minimum = min(3, len(queue))
    maximum = min(6, len(queue))
    queue.insert(random.randint(minimum, maximum), question_id)


@router.get("/status/{deck_id}")
def check_quiz_status(
    deck_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deck = session.exec(select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user.id)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Zestaw nie istnieje")
    quiz_session = get_active_session(session, current_user.id, deck_id)
    if quiz_session and queue_to_list(quiz_session.queue_str):
        migrated = ensure_progress_state(quiz_session)
        # Powrót do widoku po odświeżeniu lub zamknięciu zawsze jest bezpiecznie wstrzymany.
        if not quiz_session.is_paused:
            quiz_session.is_paused = True
            quiz_session.last_activity = datetime.utcnow()
            session.add(quiz_session)
            session.commit()
        elif migrated:
            session.add(quiz_session)
            session.commit()
        return {"has_active_session": True, "deck_title": deck.title, **progress_payload(quiz_session)}

    completed = session.exec(select(QuizSession).where(
        QuizSession.user_id == current_user.id,
        QuizSession.deck_id == deck_id,
        QuizSession.is_active == False,
        QuizSession.completed_at.is_not(None),
    ).order_by(QuizSession.completed_at.desc())).first()
    return {
        "has_active_session": False,
        "deck_title": deck.title,
        "last_summary": summary_payload(completed, session) if completed else None,
        "remaining": 0,
        "time_spent": 0,
    }


@router.post("/start/{deck_id}")
def start_quiz(
    deck_id: int,
    force_new: bool = Body(False, embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    deck = session.exec(select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user.id)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Zestaw nie istnieje")

    existing = get_active_session(session, current_user.id, deck_id)
    if existing and not force_new:
        if ensure_progress_state(existing):
            session.add(existing)
        existing.is_paused = False
        existing.last_activity = datetime.utcnow()
        session.add(existing)
        session.commit()
        return {"message": "Session continued", "session_id": existing.id, "deck_title": deck.title, **progress_payload(existing)}
    if existing:
        # Jawne „zacznij od nowa” zastępuje niedokończoną sesję, zamiast je gromadzić.
        session.delete(existing)
        session.flush()

    question_ids = list(session.exec(select(Question.id).where(Question.deck_id == deck_id)).all())
    if not question_ids:
        raise HTTPException(status_code=400, detail="Zestaw jest pusty")
    random.shuffle(question_ids)
    stats = {
        str(question_id): {"streak": 0, "correct": 0, "incorrect": 0, "mastered": False}
        for question_id in question_ids
    }
    new_session = QuizSession(
        user_id=current_user.id,
        deck_id=deck_id,
        queue_str=list_to_queue(question_ids),
        is_active=True,
        is_paused=False,
        initial_question_count=len(question_ids),
        question_stats_json=json.dumps(stats, separators=(",", ":")),
        total_answers=0,
        correct_answers=0,
        incorrect_answers=0,
        total_time_seconds=0,
        last_activity=datetime.utcnow(),
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    return {"message": "New session started", "session_id": new_session.id, "deck_title": deck.title, **progress_payload(new_session)}


@router.post("/pause/{deck_id}")
def pause_quiz(deck_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    quiz_session = get_active_session(session, current_user.id, deck_id, lock=True)
    if not quiz_session:
        raise HTTPException(status_code=404, detail="Brak sesji")
    if not quiz_session.is_paused:
        update_session_time(quiz_session)
        quiz_session.is_paused = True
        session.add(quiz_session)
        session.commit()
    return {"status": "paused", **progress_payload(quiz_session)}


@router.post("/resume/{deck_id}")
def resume_quiz(deck_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    quiz_session = get_active_session(session, current_user.id, deck_id, lock=True)
    if not quiz_session:
        raise HTTPException(status_code=404, detail="Brak sesji")
    quiz_session.last_activity = datetime.utcnow()
    quiz_session.is_paused = False
    session.add(quiz_session)
    session.commit()
    return {"status": "resumed", **progress_payload(quiz_session)}


@router.post("/heartbeat/{deck_id}")
def heartbeat(deck_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    quiz_session = get_active_session(session, current_user.id, deck_id, lock=True)
    if not quiz_session:
        raise HTTPException(status_code=404, detail="Brak sesji")
    if not quiz_session.is_paused:
        update_session_time(quiz_session)
        session.add(quiz_session)
        session.commit()
    return {"time_spent": quiz_session.total_time_seconds, "is_paused": quiz_session.is_paused}


@router.get("/next/{deck_id}")
def get_next_question(deck_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    quiz_session = get_active_session(session, current_user.id, deck_id)
    if not quiz_session:
        raise HTTPException(status_code=404, detail="Brak aktywnej sesji")
    if quiz_session.is_paused:
        raise HTTPException(status_code=409, detail="Sesja jest wstrzymana")
    if ensure_progress_state(quiz_session):
        session.add(quiz_session)
        session.commit()
    queue = queue_to_list(quiz_session.queue_str)
    if not queue:
        return {"finished": True, **summary_payload(quiz_session, session)}

    question = session.exec(select(Question).where(Question.id == queue[0]).options(selectinload(Question.answers))).first()
    if not question:
        raise HTTPException(status_code=409, detail="Pytanie z kolejki już nie istnieje")
    answers = [{"id": answer.id, "content": answer.content} for answer in question.answers]
    random.shuffle(answers)
    return {
        "finished": False,
        "question": {"id": question.id, "content": question.content, "answers": answers},
        **progress_payload(quiz_session),
    }


@router.post("/answer/{deck_id}")
def submit_answer(
    deck_id: int,
    answer_ids: List[int] = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    quiz_session = get_active_session(session, current_user.id, deck_id, lock=True)
    if not quiz_session:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje")
    if quiz_session.is_paused:
        raise HTTPException(status_code=409, detail="Sesja jest wstrzymana")
    ensure_progress_state(quiz_session)

    queue = queue_to_list(quiz_session.queue_str)
    if not queue:
        return {"finished": True, **summary_payload(quiz_session, session)}
    current_question_id = queue.pop(0)
    valid_answers = session.exec(select(Answer).where(Answer.question_id == current_question_id)).all()
    valid_ids = {answer.id for answer in valid_answers}
    user_ids = set(answer_ids)
    if not user_ids.issubset(valid_ids):
        raise HTTPException(status_code=400, detail="Przesłano odpowiedź spoza bieżącego pytania")
    correct_ids = {answer.id for answer in valid_answers if answer.is_correct}
    is_correct = user_ids == correct_ids

    stats = load_stats(quiz_session)
    item = stats.setdefault(str(current_question_id), {"streak": 0, "correct": 0, "incorrect": 0, "mastered": False})
    quiz_session.total_answers += 1
    if is_correct:
        quiz_session.correct_answers += 1
        item["correct"] = item.get("correct", 0) + 1
        item["streak"] = item.get("streak", 0) + 1
        if item["streak"] >= REQUIRED_CORRECT_STREAK:
            item["mastered"] = True
            queue = [question_id for question_id in queue if question_id != current_question_id]
        else:
            schedule_later(queue, current_question_id)
    else:
        quiz_session.incorrect_answers += 1
        item["incorrect"] = item.get("incorrect", 0) + 1
        item["streak"] = 0
        schedule_later(queue, current_question_id)

    save_stats(quiz_session, stats)
    update_session_time(quiz_session)
    mastered = sum(bool(value.get("mastered")) for value in stats.values())
    finished = mastered >= quiz_session.initial_question_count
    quiz_session.queue_str = "" if finished else list_to_queue(queue)
    if finished:
        quiz_session.is_active = False
        quiz_session.is_paused = True
        quiz_session.completed_at = datetime.utcnow()
    session.add(quiz_session)
    session.commit()

    payload = summary_payload(quiz_session, session) if finished else progress_payload(quiz_session)
    return {
        "is_correct": is_correct,
        "correct_ids": list(correct_ids),
        "finished": finished,
        "question_streak": item["streak"],
        **payload,
    }
