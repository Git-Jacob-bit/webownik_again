import threading
import time
from collections import defaultdict, deque
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from models import User
from routers.auth import get_current_user

router = APIRouter(prefix="/integrations/github", tags=["GitHub"])

_cache_lock = threading.Lock()
_feedback_lock = threading.Lock()
_release_cache: tuple[float, list[dict]] = (0.0, [])
_feedback_history: dict[str, deque[float]] = defaultdict(deque)


class FeedbackCreate(BaseModel):
    category: Literal["bug", "feature", "other"]
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=5000)
    page: str | None = Field(default=None, max_length=200)
    browser: str | None = Field(default=None, max_length=300)


def _github_headers(authenticated: bool = False) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Webownik",
    }
    if authenticated and settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


def _repository() -> str:
    repository = settings.github_repository.strip().removesuffix(".git")
    if repository.count("/") != 1:
        raise HTTPException(status_code=503, detail="Repozytorium GitHub nie jest poprawnie skonfigurowane")
    return repository


@router.get("/releases")
def list_releases(_: User = Depends(get_current_user)):
    global _release_cache
    now = time.monotonic()
    with _cache_lock:
        if now - _release_cache[0] < 600:
            return {"releases": _release_cache[1]}

    try:
        response = httpx.get(
            f"https://api.github.com/repos/{_repository()}/releases",
            headers=_github_headers(authenticated=bool(settings.github_token)),
            params={"per_page": 10},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Nie udało się pobrać changelogu z GitHuba") from exc

    releases = [
        {
            "id": release["id"],
            "name": release.get("name") or release["tag_name"],
            "tag": release["tag_name"],
            "body": release.get("body") or "",
            "published_at": release.get("published_at"),
            "url": release["html_url"],
        }
        for release in response.json()
        if not release.get("draft")
    ]
    with _cache_lock:
        _release_cache = (now, releases)
    return {"releases": releases}


@router.post("/feedback", status_code=201)
def create_feedback(payload: FeedbackCreate, current_user: User = Depends(get_current_user)):
    if not settings.github_token:
        raise HTTPException(status_code=503, detail="Feedback GitHub oczekuje na konfigurację tokenu")

    now = time.monotonic()
    user_key = str(current_user.id)
    with _feedback_lock:
        history = _feedback_history[user_key]
        while history and history[0] <= now - 3600:
            history.popleft()
        if len(history) >= 3:
            raise HTTPException(status_code=429, detail="Limit wynosi 3 zgłoszenia na godzinę")
        history.append(now)

    prefixes = {"bug": "Bug", "feature": "Pomysł", "other": "Feedback"}
    technical = []
    if payload.page:
        technical.append(f"- Strona: `{payload.page}`")
    if payload.browser:
        technical.append(f"- Przeglądarka: `{payload.browser}`")
    body = payload.description
    if technical:
        body += "\n\n---\nDane techniczne przekazane przez użytkownika:\n" + "\n".join(technical)
    body += "\n\n_Wysłano z formularza feedbacku Webownika._"

    try:
        response = httpx.post(
            f"https://api.github.com/repos/{_repository()}/issues",
            headers=_github_headers(authenticated=True),
            json={"title": f"[{prefixes[payload.category]}] {payload.title}", "body": body},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        with _feedback_lock:
            _feedback_history[user_key].remove(now)
        detail = "GitHub odrzucił zgłoszenie. Sprawdź token i uprawnienie Issues: write."
        raise HTTPException(status_code=503, detail=detail) from exc
    except httpx.RequestError as exc:
        with _feedback_lock:
            _feedback_history[user_key].remove(now)
        raise HTTPException(status_code=503, detail="GitHub jest chwilowo niedostępny") from exc

    issue = response.json()
    return {"number": issue["number"], "url": issue["html_url"]}
