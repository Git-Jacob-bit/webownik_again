import logging
import threading
from collections import deque
from functools import lru_cache

logger = logging.getLogger(__name__)
_translation_lock = threading.Lock()
_queue_condition = threading.Condition()
_queued_decks: set[int] = set()
_user_queues: dict[str, deque[int]] = {}
_user_rotation: deque[str] = deque()
_worker_started = False
MAX_GLOBAL_QUEUED_TRANSLATIONS = 100
MAX_USER_QUEUED_TRANSLATIONS = 2


@lru_cache(maxsize=1)
def _polish_to_english_translator():
    try:
        from argostranslate import translate

        installed_languages = translate.get_installed_languages()
        polish = next((language for language in installed_languages if language.code == "pl"), None)
        english = next((language for language in installed_languages if language.code == "en"), None)
        if not polish or not english:
            logger.warning("Argos PL->EN model is not installed")
            return None
        return polish.get_translation(english)
    except Exception:
        logger.exception("Unable to initialize Argos Translate")
        return None


def translate_pl_to_en(text: str | None) -> str | None:
    """Translate Polish source text to English without ever modifying the source."""
    normalized = (text or "").strip()
    if not normalized:
        return None
    translator = _polish_to_english_translator()
    if translator is None:
        return None
    try:
        translated = translator.translate(normalized).strip()
        return translated or None
    except Exception:
        logger.exception("Argos failed to translate text")
        return None


def translate_deck_in_background(deck_id: int) -> None:
    """Translate and cache a complete deck in its own database session."""
    from sqlalchemy.orm import selectinload
    from sqlmodel import Session, select

    from database import engine
    from models import Answer, Deck, Question

    with _translation_lock, Session(engine) as session:
        statement = (
            select(Deck)
            .where(Deck.id == deck_id)
            .options(selectinload(Deck.questions).selectinload(Question.answers))
        )
        deck = session.exec(statement).first()
        if not deck:
            return
        if deck.translation_status == "ready" and deck.title_en:
            return
        questions = list(deck.questions)
        answers_by_question = {question.id: list(question.answers) for question in questions}
        deck.translation_total = 1 + len(questions) + sum(len(answers) for answers in answers_by_question.values())
        deck.translation_completed = int(bool(deck.title_en)) + sum(
            int(bool(question.content_en)) + sum(int(bool(answer.content_en)) for answer in answers_by_question[question.id])
            for question in questions
        )
        deck.translation_status = "processing"
        session.add(deck)
        session.commit()

        try:
            if not deck.title_en:
                deck.title_en = translate_pl_to_en(deck.title)
                deck.translation_completed += int(bool(deck.title_en))
            successful = bool(deck.title_en)
            session.add(deck)
            session.commit()
            for question in questions:
                completed_in_batch = 0
                if not question.content_en:
                    question.content_en = translate_pl_to_en(question.content)
                    completed_in_batch += int(bool(question.content_en))
                successful = successful and bool(question.content_en)
                session.add(question)
                for answer in answers_by_question[question.id]:
                    if not answer.content_en:
                        answer.content_en = translate_pl_to_en(answer.content)
                        completed_in_batch += int(bool(answer.content_en))
                    successful = successful and bool(answer.content_en)
                    session.add(answer)
                deck.translation_completed += int(completed_in_batch)
                session.add(deck)
                session.commit()
            deck.translation_status = "ready" if successful else "failed"
            session.add(deck)
            session.commit()
        except Exception:
            session.rollback()
            failed_deck = session.get(Deck, deck_id)
            if failed_deck:
                failed_deck.translation_status = "failed"
                session.add(failed_deck)
                session.commit()
            logger.exception("Unable to translate deck %s", deck_id)


def _translation_worker() -> None:
    """Process one deck at a time, rotating fairly between users."""
    while True:
        with _queue_condition:
            while not _user_rotation:
                _queue_condition.wait()
            user_id = _user_rotation.popleft()
            user_queue = _user_queues[user_id]
            deck_id = user_queue.popleft()
            if user_queue:
                _user_rotation.append(user_id)
            else:
                del _user_queues[user_id]
        try:
            translate_deck_in_background(deck_id)
        finally:
            with _queue_condition:
                _queued_decks.discard(deck_id)


def enqueue_deck_translation(deck_id: int, user_id) -> str:
    """Deduplicate jobs and schedule them round-robin across users."""
    global _worker_started
    user_key = str(user_id)
    with _queue_condition:
        if deck_id in _queued_decks:
            return "duplicate"
        if len(_queued_decks) >= MAX_GLOBAL_QUEUED_TRANSLATIONS:
            return "global_limit"
        if len(_user_queues.get(user_key, ())) >= MAX_USER_QUEUED_TRANSLATIONS:
            return "user_limit"
        if user_key not in _user_queues:
            _user_queues[user_key] = deque()
            _user_rotation.append(user_key)
        _queued_decks.add(deck_id)
        _user_queues[user_key].append(deck_id)
        if not _worker_started:
            threading.Thread(target=_translation_worker, daemon=True, name="argos-worker").start()
            _worker_started = True
        _queue_condition.notify()
    return "queued"
