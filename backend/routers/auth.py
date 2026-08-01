from typing import Annotated
from uuid import UUID
from urllib.parse import quote
import secrets

import httpx
from fastapi import APIRouter, Cookie, Depends, Form, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from config import settings
from database import get_session
from models import User
from schemas import UserCreate, UserRead


router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

ACCESS_COOKIE = "webownik_access"
REFRESH_COOKIE = "webownik_refresh"
CSRF_COOKIE = "webownik_csrf"


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
            f"{settings.supabase_url.rstrip('/')}/auth/v1{path}",
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
                "remoteip": request.headers.get("CF-Connecting-IP") or (request.client.host if request.client else ""),
            },
            timeout=10,
        ).json()
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Nie udało się zweryfikować Turnstile") from exc
    if not result.get("success"):
        raise HTTPException(status_code=400, detail="Weryfikacja Turnstile nie powiodła się")


def _upsert_profile(session: Session, auth_user: dict) -> User:
    user_id = UUID(auth_user["id"])
    user = session.get(User, user_id)
    if user is None:
        user = User(id=user_id, email=auth_user["email"], is_active=True)
    else:
        user.email = auth_user["email"]
        user.is_active = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


async def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)],
    session: Session = Depends(get_session),
) -> User:
    token = token or request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Brak aktywnej sesji")
    try:
        auth_user = _auth_request("GET", "/user", token=token)
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowa lub wygasła sesja",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return _upsert_profile(session, auth_user)


@router.post("/register")
def register_user(user_data: UserCreate, request: Request, session: Session = Depends(get_session)):
    _verify_turnstile(user_data.turnstile_token, request)
    redirect = quote(_frontend_url("/email-confirmed"), safe='')
    result = _auth_request("POST", f"/signup?redirect_to={redirect}", json={
        "email": user_data.email,
        "password": user_data.password,
    })
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
    response: Response,
    current_user: User = Depends(get_current_user),
):
    fresh_session = _auth_request("POST", "/token?grant_type=password", json={
        "email": current_user.email,
        "password": password_data.old_password,
    })
    _auth_request("PUT", "/user", json={"password": password_data.new_password}, token=fresh_session["access_token"])
    _set_session_cookies(response, fresh_session)
    return {"message": "Hasło zostało zmienione"}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    redirect = quote(_frontend_url("/reset-password"), safe='')
    _auth_request("POST", f"/recover?redirect_to={redirect}", json={"email": str(data.email)})
    return {"message": "Jeśli e-mail istnieje, instrukcje zostały wysłane."}


class PasswordReset(BaseModel):
    access_token: str = Field(min_length=20, max_length=4096)
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/reset-password-confirm")
def reset_password_confirm(data: PasswordReset):
    _auth_request("PUT", "/user", json={"password": data.new_password}, token=data.access_token)
    return {"message": "Hasło zmienione. Możesz się zalogować."}


@router.get("/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=204)
def delete_my_account(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    user_id = str(current_user.id)
    _auth_request("DELETE", f"/admin/users/{user_id}", secret=True)
    _clear_session_cookies(response)
    return None


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        try:
            _auth_request("POST", "/logout", token=token)
        except HTTPException:
            pass
    _clear_session_cookies(response)
    return None
