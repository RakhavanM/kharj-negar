import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import AuthSession, Category, Expense, Household, User
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
    from app import rate_limit

    rate_limit._attempts.clear()
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
    db.flush()
    creator = db.scalar(select(User).where(User.username == "ramin"))
    db.add_all([
        Category(household_id=household.id, created_by_id=creator.id, code="daily", name="خرج روزمره", sort_order=10, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="installment", name="قسط", sort_order=20, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="rent", name="اجاره", sort_order=30, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="car", name="ماشین", sort_order=40, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="home", name="وسایل خانه", sort_order=50, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="debt", name="قرض", sort_order=60, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="pet", name="پت", sort_order=70, version=1, is_active=True),
        Category(household_id=household.id, created_by_id=creator.id, code="miscellaneous", name="خرج متفرقه", sort_order=80, version=1, is_active=True),
    ])
    db.commit()
    db.close()
    yield
    db = TestSession()
    db.execute(delete(AuthSession))
    db.execute(delete(Expense))
    db.execute(delete(Category))
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
