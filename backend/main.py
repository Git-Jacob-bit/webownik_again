import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from sqlmodel import select

from config import settings
from database import engine
from routers import auth, dashboard, decks, quiz


def wait_for_db() -> None:
    for attempt in range(1, 6):
        try:
            with engine.connect() as connection:
                connection.execute(select(1))
            return
        except OperationalError:
            if attempt == 5:
                raise RuntimeError("Nie udało się połączyć z bazą danych")
            time.sleep(2)


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_db()
    yield


app = FastAPI(
    title="Webownik API",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

allowed_hosts = [host.strip() for host in settings.allowed_hosts.split(",") if host.strip()]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Authorization", "Content-Type", "X-CSRF-Token"],
)

csrf_exempt = {
    "/auth/token", "/auth/register", "/auth/forgot-password",
    "/auth/reset-password-confirm",
}
rate_limits = {
    "/auth/token": (10, 300),
    "/auth/register": (5, 600),
    "/auth/forgot-password": (3, 3600),
    "/auth/reset-password-confirm": (5, 600),
}
request_history: dict[tuple[str, str], deque[float]] = defaultdict(deque)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    client_ip = request.headers.get("CF-Connecting-IP") or (request.client.host if request.client else "unknown")
    limit = rate_limits.get(request.url.path)
    if limit and request.method == "POST":
        maximum, window = limit
        key = (client_ip, request.url.path)
        now = time.monotonic()
        history = request_history[key]
        while history and history[0] <= now - window:
            history.popleft()
        if len(history) >= maximum:
            return JSONResponse({"detail": "Zbyt wiele prób. Spróbuj ponownie później."}, status_code=429)
        history.append(now)

    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path not in csrf_exempt:
        if request.cookies.get(auth.ACCESS_COOKIE):
            cookie_token = request.cookies.get(auth.CSRF_COOKIE, "")
            header_token = request.headers.get("X-CSRF-Token", "")
            if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
                return JSONResponse({"detail": "Nieprawidłowy token CSRF"}, status_code=403)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/auth/") else response.headers.get("Cache-Control", "")
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    return response


app.include_router(auth.router)
app.include_router(decks.router)
app.include_router(quiz.router)
app.include_router(dashboard.router)
