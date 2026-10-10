from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import routers.auth as auth
from network import client_ip
from routers.github import _inline_code, _neutralize_markdown


def _request(peer: str, cf_ip: str | None = None):
    headers = {"CF-Connecting-IP": cf_ip} if cf_ip else {}
    return SimpleNamespace(client=SimpleNamespace(host=peer), headers=headers)


def test_cf_connecting_ip_is_trusted_only_from_proxy_network():
    assert client_ip(_request("10.10.0.5", "203.0.113.7")) == "203.0.113.7"
    assert client_ip(_request("172.18.0.9", "203.0.113.7")) == "172.18.0.9"
    assert client_ip(_request("10.10.0.5", "not-an-ip")) == "10.10.0.5"


def test_mutation_with_session_cookie_requires_csrf_header(anonymous_client):
    anonymous_client.cookies.set(auth.ACCESS_COOKIE, "token")
    anonymous_client.cookies.set(auth.CSRF_COOKIE, "csrf")

    assert anonymous_client.post("/todos", json={"text": "x"}).status_code == 403


def test_security_headers_are_set(anonymous_client):
    response = anonymous_client.get("/health")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_feedback_markdown_is_neutralized():
    text = _neutralize_markdown("![x](https://t.example/p.png) <img src=x> @octocat")

    assert "![" not in text
    assert "<img" not in text
    assert "@octocat" not in text
    assert _inline_code("a`b\nc") == "`a'b c`"


@pytest.fixture
def fake_supabase(monkeypatch):
    calls = []
    responses = {}

    def fake(method, path, **kwargs):
        calls.append((method, path, kwargs))
        for prefix, result in responses.items():
            if path.startswith(prefix):
                if isinstance(result, Exception):
                    raise result
                return result
        return {}

    monkeypatch.setattr(auth, "_auth_request", fake)
    auth._session_cache.clear()
    auth._reauth_failures.clear()
    return SimpleNamespace(calls=calls, responses=responses)


def test_register_hides_existing_accounts(anonymous_client, fake_supabase):
    fake_supabase.responses["/signup"] = HTTPException(422, "User already registered")

    response = anonymous_client.post("/auth/register", json={"email": "a@example.com", "password": "Haslo1234"})

    assert response.status_code == 200


def test_register_still_reports_weak_password(anonymous_client, fake_supabase):
    fake_supabase.responses["/signup"] = HTTPException(422, "Password should contain digits")

    response = anonymous_client.post("/auth/register", json={"email": "a@example.com", "password": "haslohaslo"})

    assert response.status_code == 422


def test_forgot_password_does_not_leak_errors(anonymous_client, fake_supabase):
    fake_supabase.responses["/recover"] = HTTPException(429, "email rate limit exceeded")

    response = anonymous_client.post("/auth/forgot-password", json={"email": "a@example.com"})

    assert response.status_code == 200


def test_account_deletion_requires_password_and_limits_attempts(client, fake_supabase):
    fake_supabase.responses["/token"] = HTTPException(400, "Invalid login credentials")

    for _ in range(auth.MAX_REAUTH_FAILURES):
        assert client.request("DELETE", "/auth/me", json={"password": "zle"}).status_code == 400
    assert client.request("DELETE", "/auth/me", json={"password": "zle"}).status_code == 429
    assert not any(path.startswith("/admin/users") for _, path, _ in fake_supabase.calls)


def test_account_deletion_with_correct_password(client, fake_supabase):
    fake_supabase.responses["/token"] = {"access_token": "fresh"}

    assert client.request("DELETE", "/auth/me", json={"password": "dobre"}).status_code == 204
    assert any(path.startswith("/admin/users/") for _, path, _ in fake_supabase.calls)


def test_change_password_revokes_other_sessions(client, fake_supabase):
    fake_supabase.responses["/token"] = {"access_token": "fresh", "refresh_token": "r", "expires_in": 3600}

    response = client.post("/auth/change-password", json={"old_password": "stare", "new_password": "NoweHaslo1"})

    assert response.status_code == 200
    assert ("POST", "/logout?scope=others") in [(method, path) for method, path, _ in fake_supabase.calls]


def test_session_lookup_is_cached_and_inactive_users_are_blocked(anonymous_client, fake_supabase, session, user):
    fake_supabase.responses["/user"] = {"id": str(user.id), "email": user.email}
    anonymous_client.cookies.set(auth.ACCESS_COOKIE, "token")

    assert anonymous_client.get("/auth/me").status_code == 200
    assert anonymous_client.get("/auth/me").status_code == 200
    assert [path for _, path, _ in fake_supabase.calls].count("/user") == 1

    user.is_active = False
    session.add(user)
    session.commit()
    assert anonymous_client.get("/auth/me").status_code == 403


def test_auth_url_supports_gateway_and_direct_gotrue():
    from config import Settings

    base = {"database_url": "sqlite://", "supabase_publishable_key": "p", "supabase_secret_key": "s", "domain": "http://x"}
    assert Settings(**base, supabase_url="http://kong:8000/").auth_base_url == "http://kong:8000/auth/v1"
    assert Settings(**base, supabase_url="", supabase_auth_url="http://auth:9999/").auth_base_url == "http://auth:9999"
    with pytest.raises(ValueError):
        Settings(**base, supabase_url="", supabase_auth_url="")
