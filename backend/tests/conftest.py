import os
import tempfile
from uuid import uuid4

_db_dir = tempfile.mkdtemp(prefix="webownik-tests-")
os.environ.update({
    "DATABASE_URL": f"sqlite:///{_db_dir}/test.db",
    "SUPABASE_URL": "http://supabase.test",
    "SUPABASE_PUBLISHABLE_KEY": "publishable",
    "SUPABASE_SECRET_KEY": "secret",
    "DOMAIN": "http://localhost:5173",
    "ENVIRONMENT": "test",
    "ALLOWED_HOSTS": "testserver",
    "TRUSTED_PROXY_CIDRS": "10.10.0.0/24",
    "TURNSTILE_SECRET_KEY": "",
    "GITHUB_TOKEN": "",
})

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import Session, SQLModel

from database import engine
import main
from models import User
from routers.auth import get_current_user


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _):
    # W Postgresie kaskady są w migracjach; w SQLite trzeba je włączyć ręcznie.
    dbapi_connection.execute("PRAGMA foreign_keys=ON")


@pytest.fixture(autouse=True)
def _database():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    main.request_history.clear()
    yield


@pytest.fixture
def session():
    with Session(engine) as db:
        yield db


def make_user(session: Session, email: str | None = None) -> User:
    user = User(id=uuid4(), email=email or f"{uuid4().hex[:8]}@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def user(session):
    return make_user(session, "owner@example.com")


@pytest.fixture
def client(user):
    main.app.dependency_overrides[get_current_user] = lambda: user
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()


@pytest.fixture
def anonymous_client():
    with TestClient(main.app) as test_client:
        yield test_client
