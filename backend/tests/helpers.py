from sqlmodel import Session

from models import Answer, Deck, Question


def make_deck(session: Session, user, questions: int = 2, title: str = "Talia testowa") -> Deck:
    deck = Deck(title=title, user_id=user.id)
    session.add(deck)
    session.flush()
    for index in range(questions):
        question = Question(content=f"Pytanie {index + 1}", deck_id=deck.id)
        session.add(question)
        session.flush()
        session.add(Answer(content="Dobra", is_correct=True, question_id=question.id))
        session.add(Answer(content="Zła", is_correct=False, question_id=question.id))
    session.commit()
    session.refresh(deck)
    return deck


def correct_answer_ids(client, deck_id: int) -> tuple[int, list[int]]:
    payload = client.get(f"/quiz/next/{deck_id}").json()
    question = payload["question"]
    deck = client.get(f"/decks/{deck_id}").json()
    answers = next(item for item in deck["questions"] if item["id"] == question["id"])["answers"]
    return question["id"], [answer["id"] for answer in answers if answer["is_correct"]]
