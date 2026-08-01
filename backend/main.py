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
from routers import auth, dashboard, decks, github, quiz


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
MAX_RATE_LIMIT_KEYS = 10_000


def _request_limits(request: Request) -> list[tuple[str, int, int]]:
    limits = [("global", 600, 60)]
    configured = rate_limits.get(request.url.path)
    if configured and request.method == "POST":
        limits.append((request.url.path, *configured))
    if request.method == "POST" and request.url.path == "/decks/upload-form":
        limits.append(("deck-upload", 10, 3600))
    if request.method == "POST" and request.url.path.startswith("/decks/") and request.url.path.endswith("/translate"):
        limits.append(("translation-start", 10, 3600))
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        limits.append(("mutations", 120, 60))
    return limits


def _prune_rate_limit_keys(now: float) -> None:
    if len(request_history) <= MAX_RATE_LIMIT_KEYS:
        return
    stale = [key for key, history in request_history.items() if not history or history[-1] <= now - 3600]
    for key in stale:
        request_history.pop(key, None)
    while len(request_history) > MAX_RATE_LIMIT_KEYS:
        request_history.pop(next(iter(request_history)))


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    forwarded_ip = request.headers.get("CF-Connecting-IP") if settings.is_production else None
    client_ip = forwarded_ip or (request.client.host if request.client else "unknown")
    now = time.monotonic()
    _prune_rate_limit_keys(now)
    for bucket, maximum, window in _request_limits(request):
        key = (client_ip, bucket)
        history = request_history[key]
        while history and history[0] <= now - window:
            history.popleft()
        if len(history) >= maximum:
            return JSONResponse(
                {"detail": "Zbyt wiele żądań. Spróbuj ponownie później."},
                status_code=429,
                headers={"Retry-After": str(window)},
            )
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
    response.headers["Cache-Control"] = "no-store"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    return response


@app.get("/health", include_in_schema=False)
def healthcheck():
    with engine.connect() as connection:
        connection.execute(select(1))
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(decks.router)
app.include_router(quiz.router)
app.include_router(dashboard.router)
app.include_router(github.router)
