import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import AuthSession, Expense, Household, User
from app.security import hash_password

TEST_ENGINE = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(bind=TEST_ENGINE, autoflush=False, autocommit=False, expire_on_commit=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def reset_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(TEST_ENGINE)
    Base.metadata.create_all(TEST_ENGINE)
    db = TestSession()
    household = Household(name="تست فیچرهای خرج‌نگار")
    db.add(household)
    db.flush()
    db.add_all([
        User(username="ramin", person="ramin", household_id=household.id, password_hash=hash_password("ramin-test-password-123")),
        User(username="mana", person="mana", household_id=household.id, password_hash=hash_password("mana-test-password-123")),
    ])
    db.commit()
    db.close()
    yield
    db = TestSession()
    db.execute(delete(AuthSession))
    db.execute(delete(Expense))
    db.execute(delete(User))
    db.execute(delete(Household))
    db.commit()
    db.close()
    Base.metadata.drop_all(TEST_ENGINE)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client
