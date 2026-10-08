import json

from sqlmodel import select

from models import Answer, Deck, Question, QuizSession
from tests.conftest import make_user
from tests.helpers import correct_answer_ids, make_deck


def _answer_correctly(client, deck_id):
    _, correct = correct_answer_ids(client, deck_id)
    return client.post(f"/quiz/answer/{deck_id}", json={"answer_ids": correct}).json()


def test_deleting_question_keeps_active_quiz_usable(client, session, user):
    deck = make_deck(session, user, questions=2)
    client.post(f"/quiz/start/{deck.id}", json={"force_new": False})
    current_id = client.get(f"/quiz/next/{deck.id}").json()["question"]["id"]

    assert client.delete(f"/decks/question/{current_id}").status_code == 200

    next_payload = client.get(f"/quiz/next/{deck.id}")
    assert next_payload.status_code == 200
    assert next_payload.json()["initial_questions"] == 1
    assert next_payload.json()["question"]["id"] != current_id

    _answer_correctly(client, deck.id)
    result = _answer_correctly(client, deck.id)
    assert result["finished"] is True


def test_deleting_last_question_finishes_session(client, session, user):
    deck = make_deck(session, user, questions=2)
    client.post(f"/quiz/start/{deck.id}", json={"force_new": False})
    for question in session.exec(select(Question).where(Question.deck_id == deck.id)).all():
        client.delete(f"/decks/question/{question.id}")

    assert session.exec(select(QuizSession).where(QuizSession.is_active == True)).first() is None


def test_added_question_joins_active_quiz(client, session, user):
    deck = make_deck(session, user, questions=1)
    client.post(f"/quiz/start/{deck.id}", json={"force_new": False})

    new_id = client.post(f"/decks/{deck.id}/question", json={"content": "Nowe pytanie"}).json()["id"]

    quiz_session = session.exec(select(QuizSession).where(QuizSession.deck_id == deck.id)).one()
    assert quiz_session.initial_question_count == 2
    assert str(new_id) in json.loads(quiz_session.question_stats_json)
    assert quiz_session.queue_str.split(",")[-1] == str(new_id)


def test_update_question_can_add_and_remove_answers(client, session, user):
    deck = make_deck(session, user, questions=1)
    question = session.exec(select(Question).where(Question.deck_id == deck.id)).one()
    kept, removed = session.exec(select(Answer).where(Answer.question_id == question.id).order_by(Answer.id)).all()
    kept_id, removed_id = kept.id, removed.id

    response = client.put(f"/decks/question/{question.id}/full", json={
        "content": "Zmienione pytanie",
        "answers": [
            {"id": kept_id, "content": "Dobra", "is_correct": True},
            {"content": "Nowa", "is_correct": False},
        ],
    })

    assert response.status_code == 200
    session.expire_all()
    answers = session.exec(select(Answer).where(Answer.question_id == question.id).order_by(Answer.id)).all()
    assert [answer.content for answer in answers] == ["Dobra", "Nowa"]
    assert removed_id not in {answer.id for answer in answers}


def test_update_question_requires_a_correct_answer(client, session, user):
    deck = make_deck(session, user, questions=1)
    question = session.exec(select(Question).where(Question.deck_id == deck.id)).one()

    response = client.put(f"/decks/question/{question.id}/full", json={
        "content": "Pytanie",
        "answers": [{"content": "Zła", "is_correct": False}],
    })

    assert response.status_code == 422


def test_update_question_rejects_foreign_answer_ids(client, session, user):
    deck = make_deck(session, user, questions=2)
    first, second = session.exec(select(Question).where(Question.deck_id == deck.id).order_by(Question.id)).all()
    foreign = session.exec(select(Answer).where(Answer.question_id == second.id)).first()

    response = client.put(f"/decks/question/{first.id}/full", json={
        "content": "Pytanie",
        "answers": [{"id": foreign.id, "content": "X", "is_correct": True}],
    })

    assert response.status_code == 400


def test_delete_deck_cascades(client, session, user):
    deck = make_deck(session, user, questions=2)
    client.post(f"/quiz/start/{deck.id}", json={"force_new": False})

    assert client.delete(f"/decks/{deck.id}").status_code == 200

    session.expire_all()
    assert session.exec(select(Question)).all() == []
    assert session.exec(select(Answer)).all() == []
    assert session.exec(select(QuizSession)).all() == []


def test_other_users_deck_is_not_accessible(client, session):
    stranger = make_user(session)
    deck = make_deck(session, stranger, questions=1)
    question = session.exec(select(Question).where(Question.deck_id == deck.id)).one()

    assert client.get(f"/decks/{deck.id}").status_code == 403
    assert client.delete(f"/decks/{deck.id}").status_code == 403
    assert client.delete(f"/decks/question/{question.id}").status_code == 403
    assert client.post(f"/decks/{deck.id}/question", json={"content": "abc"}).status_code == 404
    assert client.post(f"/quiz/start/{deck.id}", json={"force_new": False}).status_code == 404
    assert session.get(Deck, deck.id) is not None


def test_answer_from_other_question_is_rejected(client, session, user):
    deck = make_deck(session, user, questions=2)
    client.post(f"/quiz/start/{deck.id}", json={"force_new": False})
    current_id = client.get(f"/quiz/next/{deck.id}").json()["question"]["id"]
    other_answer = session.exec(select(Answer).where(Answer.question_id != current_id)).first()

    response = client.post(f"/quiz/answer/{deck.id}", json={"answer_ids": [other_answer.id]})

    assert response.status_code == 400
