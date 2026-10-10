from collections import defaultdict, deque
from typing import Annotated
from uuid import UUID
from urllib.parse import quote
import hashlib
import logging
import secrets
import threading
import time

import httpx
from fastapi import APIRouter, Cookie, Depends, Form, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from config import settings
from database import get_session
from models import User
from network import client_ip
from schemas import UserCreate, UserRead


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

ACCESS_COOKIE = "webownik_access"
REFRESH_COOKIE = "webownik_refresh"
CSRF_COOKIE = "webownik_csrf"

# Krótki cache weryfikacji tokenu: każde zapytanie API nie musi pytać Supabase o sesję.
# Wylogowanie i zmiana hasła usuwają wpis od razu; w innych przypadkach odwołana sesja
# działa najwyżej SESSION_CACHE_TTL sekund dłużej.
SESSION_CACHE_TTL = 30
MAX_SESSION_CACHE_ENTRIES = 10_000
_session_cache: dict[str, tuple[float, dict]] = {}
_session_cache_lock = threading.Lock()

# Limit błędnych prób hasła przy operacjach wymagających ponownego uwierzytelnienia.
MAX_REAUTH_FAILURES = 5
REAUTH_WINDOW_SECONDS = 15 * 60
_reauth_failures: dict[str, deque[float]] = defaultdict(deque)
_reauth_lock = threading.Lock()


def _token_key(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _cached_auth_user(token: str) -> dict | None:
    now = time.monotonic()
    with _session_cache_lock:
        entry = _session_cache.get(_token_key(token))
        if entry and entry[0] > now:
            return entry[1]
    return None


def _cache_auth_user(token: str, auth_user: dict) -> None:
    now = time.monotonic()
    with _session_cache_lock:
        if len(_session_cache) >= MAX_SESSION_CACHE_ENTRIES:
            for key in [key for key, (expires, _) in _session_cache.items() if expires <= now]:
                del _session_cache[key]
            while len(_session_cache) >= MAX_SESSION_CACHE_ENTRIES:
                _session_cache.pop(next(iter(_session_cache)))
        _session_cache[_token_key(token)] = (now + SESSION_CACHE_TTL, auth_user)


def forget_token(token: str | None) -> None:
    if token:
        with _session_cache_lock:
            _session_cache.pop(_token_key(token), None)


def _forget_user_tokens(user_id: str) -> None:
    with _session_cache_lock:
        for key in [key for key, (_, user) in _session_cache.items() if user.get("id") == user_id]:
            del _session_cache[key]


def _frontend_url(path: str) -> str:
    return f"{settings.domain.rstrip('/')}/{path.lstrip('/')}"


def _set_session_cookies(response: Response, result: dict) -> None:
    max_age = int(result.get("expires_in") or 3600)
    common = {
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.set_cookie(ACCESS_COOKIE, result["access_token"], httponly=True, max_age=max_age, **common)
    response.set_cookie(REFRESH_COOKIE, result["refresh_token"], httponly=True, max_age=60 * 60 * 24 * 30, **common)
    response.set_cookie(CSRF_COOKIE, secrets.token_urlsafe(32), httponly=False, max_age=60 * 60 * 24 * 30, **common)


def _clear_session_cookies(response: Response) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(name, path="/", secure=settings.cookie_secure, samesite=settings.cookie_samesite)


def _headers(secret: bool = False, token: str | None = None) -> dict[str, str]:
    key = settings.supabase_secret_key if secret else settings.supabase_publishable_key
    headers = {"apikey": key, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif secret:
        headers["Authorization"] = f"Bearer {key}"
    return headers


def _auth_request(method: str, path: str, *, json: dict | None = None,
                  token: str | None = None, secret: bool = False) -> dict:
    try:
        response = httpx.request(
            method,
            f"{settings.auth_base_url}{path}",
            headers=_headers(secret=secret, token=token),
            json=json,
            timeout=15,
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Usługa logowania jest chwilowo niedostępna") from exc

    if response.is_error:
        try:
            payload = response.json()
            detail = payload.get("msg") or payload.get("message") or payload.get("error_description")
        except ValueError:
            detail = None
        raise HTTPException(status_code=response.status_code, detail=detail or "Błąd Supabase Auth")
    return response.json() if response.content else {}


def _verify_turnstile(token: str | None, request: Request) -> None:
    if not settings.turnstile_secret_key:
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Turnstile nie jest skonfigurowany")
        return
    if not token:
        raise HTTPException(status_code=400, detail="Potwierdź, że nie jesteś robotem")
    try:
        result = httpx.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": settings.turnstile_secret_key,
                "response": token,
                "remoteip": client_ip(request),
            },
            timeout=10,
        ).json()
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Nie udało się zweryfikować Turnstile") from exc
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="Weryfikacja Turnstile nie powiodła się")


def _upsert_profile(session: Session, auth_user: dict) -> User:
    """Tworzy profil lub synchronizuje e-mail. Zapisuje tylko, gdy coś się zmieniło.

    Nie dotyka is_active, żeby zablokowane konto nie odblokowywało się przy logowaniu.
    """
    user_id = UUID(auth_user["id"])
    user = session.get(User, user_id)
    if user is not None and user.email == auth_user["email"]:
        return user
    if user is None:
        user = User(id=user_id, email=auth_user["email"], is_active=True)
    else:
        user.email = auth_user["email"]
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)],
    session: Session = Depends(get_session),
) -> User:
    token = token or request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Brak aktywnej sesji")
    auth_user = _cached_auth_user(token)
    if auth_user is None:
        try:
            auth_user = _auth_request("GET", "/user", token=token)
        except HTTPException as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Nieprawidłowa lub wygasła sesja",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        _cache_auth_user(token, auth_user)
    user = _upsert_profile(session, auth_user)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto zostało zablokowane")
    return user


def _verify_password(user: User, password: str) -> dict:
    """Sprawdza hasło zalogowanego użytkownika i zwraca świeżą sesję Supabase."""
    key = str(user.id)
    now = time.monotonic()
    with _reauth_lock:
        failures = _reauth_failures[key]
        while failures and failures[0] <= now - REAUTH_WINDOW_SECONDS:
            failures.popleft()
        if len(failures) >= MAX_REAUTH_FAILURES:
            raise HTTPException(
                status_code=429,
                detail="Zbyt wiele błędnych prób hasła. Spróbuj ponownie później.",
                headers={"Retry-After": str(REAUTH_WINDOW_SECONDS)},
            )
    try:
        return _auth_request("POST", "/token?grant_type=password", json={
            "email": user.email,
            "password": password,
        })
    except HTTPException as exc:
        if exc.status_code >= 500:
            raise
        with _reauth_lock:
            _reauth_failures[key].append(now)
        raise HTTPException(status_code=400, detail="Nieprawidłowe obecne hasło") from exc


def _logout_sessions(token: str, scope: str) -> None:
    try:
        _auth_request("POST", f"/logout?scope={scope}", token=token)
    except HTTPException:
        logger.warning("Unable to revoke %s sessions", scope)


@router.post("/register")
def register_user(user_data: UserCreate, request: Request, session: Session = Depends(get_session)):
    _verify_turnstile(user_data.turnstile_token, request)
    redirect = quote(_frontend_url("/email-confirmed"), safe='')
    try:
        result = _auth_request("POST", f"/signup?redirect_to={redirect}", json={
            "email": user_data.email,
            "password": user_data.password,
        })
    except HTTPException as exc:
        # Ta sama odpowiedź co przy sukcesie, żeby nie zdradzać, które adresy mają konto.
        if "already" not in str(exc.detail).lower():
            raise
        result = {}
    auth_user = result.get("user") or result
    if auth_user.get("id") and auth_user.get("email"):
        _upsert_profile(session, auth_user)
    return {
        "message": "Konto utworzone. Sprawdź e-mail, jeśli wymagane jest potwierdzenie.",
        "email": user_data.email,
    }


@router.post("/token")
def login_for_access_token(
    response: Response,
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    turnstile_token: Annotated[str | None, Form()] = None,
    session: Session = Depends(get_session),
):
    _verify_turnstile(turnstile_token, request)
    try:
        result = _auth_request("POST", "/token?grant_type=password", json={
            "email": form_data.username,
            "password": form_data.password,
        })
    except HTTPException as exc:
        if "email not confirmed" in str(exc.detail).lower():
            raise HTTPException(status_code=403, detail="Najpierw potwierdź adres e-mail") from exc
        raise HTTPException(status_code=401, detail="Błędny e-mail lub hasło") from exc
    if result.get("user"):
        _upsert_profile(session, result["user"])
    _set_session_cookies(response, result)
    return {"message": "Zalogowano", "expires_in": result.get("expires_in")}


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


@router.post("/refresh")
def refresh_session(response: Response, data: RefreshRequest | None = None, webownik_refresh: str | None = Cookie(default=None)):
    refresh_token = webownik_refresh or (data.refresh_token if data else None)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Brak refresh tokena")
    result = _auth_request("POST", "/token?grant_type=refresh_token", json={
        "refresh_token": refresh_token,
    })
    _set_session_cookies(response, result)
    return {"message": "Sesja odświeżona", "expires_in": result.get("expires_in")}


class PasswordChange(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    fresh_session = _verify_password(current_user, password_data.old_password)
    _auth_request("PUT", "/user", json={"password": password_data.new_password}, token=fresh_session["access_token"])
    # Zmiana hasła wylogowuje pozostałe urządzenia.
    _logout_sessions(fresh_session["access_token"], "others")
    _forget_user_tokens(str(current_user.id))
    forget_token(request.cookies.get(ACCESS_COOKIE))
    _set_session_cookies(response, fresh_session)
    return {"message": "Hasło zostało zmienione"}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    turnstile_token: str | None = Field(default=None, max_length=4096)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request):
    _verify_turnstile(data.turnstile_token, request)
    redirect = quote(_frontend_url("/reset-password"), safe='')
    try:
        _auth_request("POST", f"/recover?redirect_to={redirect}", json={"email": str(data.email)})
    except HTTPException as exc:
        # Błędy typu „nie ma takiego adresu” lub limit wysyłki nie mogą zdradzać stanu konta.
        if exc.status_code >= 500:
            raise
        logger.info("Password recovery request rejected by Supabase (%s)", exc.status_code)
    return {"message": "Jeśli e-mail istnieje, instrukcje zostały wysłane."}


class PasswordReset(BaseModel):
    access_token: str = Field(min_length=20, max_length=4096)
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/reset-password-confirm")
def reset_password_confirm(data: PasswordReset):
    _auth_request("PUT", "/user", json={"password": data.new_password}, token=data.access_token)
    # Reset hasła kończy wszystkie istniejące sesje, także tę z linku odzyskiwania.
    _logout_sessions(data.access_token, "global")
    return {"message": "Hasło zmienione. Możesz się zalogować."}


@router.get("/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


class AccountDeletion(BaseModel):
    password: str = Field(min_length=1, max_length=128)


@router.delete("/me", status_code=204)
def delete_my_account(
    data: AccountDeletion,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    _verify_password(current_user, data.password)
    user_id = str(current_user.id)
    _auth_request("DELETE", f"/admin/users/{user_id}", secret=True)
    _forget_user_tokens(user_id)
    forget_token(request.cookies.get(ACCESS_COOKIE))
    _clear_session_cookies(response)
    return None


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    token = request.cookies.get(ACCESS_COOKIE)
    forget_token(token)
    if token:
        try:
            _auth_request("POST", "/logout", token=token)
        except HTTPException:
            pass
    _clear_session_cookies(response)
    return None
