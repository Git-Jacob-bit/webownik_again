from tests.helpers import make_deck


def test_export_contains_user_data(client, session, user):
    make_deck(session, user, questions=1, title="Eksport")
    client.post("/notes", json={"title": "Notatka", "content": "treść"})
    client.post("/links", json={"title": "Link", "url": "https://example.com", "category": "Inne"})

    response = client.get("/account/export")

    assert response.status_code == 200
    assert "attachment" in response.headers["Content-Disposition"]
    data = response.json()
    assert data["user"]["email"] == user.email
    assert data["decks"][0]["title"] == "Eksport"
    assert data["decks"][0]["questions"][0]["answers"][0]["is_correct"] is True
    assert data["notes"][0]["title"] == "Notatka"
    assert data["links"][0]["url"].startswith("https://example.com")


def test_links_reject_javascript_urls(client):
    response = client.post("/links", json={"title": "x", "url": "javascript:alert(1)", "category": "Inne"})

    assert response.status_code == 422
