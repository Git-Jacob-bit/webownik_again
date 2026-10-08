import re
from pathlib import Path

from models import Deck
from tests.helpers import make_deck
from translation import reset_interrupted_translations

BACKEND = Path(__file__).resolve().parents[1]
MIGRATIONS = BACKEND.parent / "supabase" / "migrations"


def test_every_status_written_by_code_is_allowed_by_database_constraint():
    sources = "\n".join(path.read_text() for path in BACKEND.rglob("*.py") if "tests" not in path.parts)
    used = set(re.findall(r'translation_status\s*=\s*"(\w+)"', sources))
    used |= set(re.findall(r'translation_status="(\w+)"', sources))

    migrations = "\n".join(path.read_text() for path in sorted(MIGRATIONS.glob("*.sql")))
    definitions = re.findall(r"check \(translation_status in \(([^)]*)\)\)", migrations)
    allowed = set(re.findall(r"'(\w+)'", definitions[-1]))

    assert used, "nie znaleziono statusów w kodzie"
    assert used <= allowed, f"brak w ograniczeniu bazy: {used - allowed}"


def test_interrupted_translations_are_reset_on_startup(session, user):
    queued = make_deck(session, user, questions=0, title="kolejka")
    processing = make_deck(session, user, questions=0, title="w toku")
    ready = make_deck(session, user, questions=0, title="gotowa")
    for deck, status in ((queued, "queued"), (processing, "processing"), (ready, "ready")):
        deck.translation_status = status
        session.add(deck)
    session.commit()

    assert reset_interrupted_translations() == 2

    session.expire_all()
    assert session.get(Deck, queued.id).translation_status == "pending"
    assert session.get(Deck, processing.id).translation_status == "pending"
    assert session.get(Deck, ready.id).translation_status == "ready"


def test_translate_endpoint_queues_deck(client, session, user, monkeypatch):
    import routers.decks as decks_router

    monkeypatch.setattr(decks_router, "enqueue_deck_translation", lambda *_: "queued")
    deck = make_deck(session, user, questions=1)

    response = client.post(f"/decks/{deck.id}/translate")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "queued": True, "translation_status": "queued"}
