import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import AuthSession, Expense, Household, User
from app.security import hash_password


test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def reset_database():
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    db = TestSession()
    household = Household(name="تست")
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
    Base.metadata.drop_all(test_engine)


def login(client: TestClient, username: str = "ramin") -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": f"{username}-test-password-123"})
    assert response.status_code == 200, response.text
    csrf = client.cookies.get("kharj_csrf")
    assert csrf
    return csrf


def test_login_create_filter_summary_update_delete_flow():
    with TestClient(app, base_url="https://testserver") as client:
        csrf = login(client)
        headers = {"X-CSRF-Token": csrf}
        create = client.post(
            "/api/expenses",
            headers=headers,
            json={
                "amount_thousands": 500,
                "person": "ramin",
                "category": "daily",
                "jalali_date": "۱۴۰۴/۰۱/۰۱",
                "note": "تست API",
            },
        )
        assert create.status_code == 201, create.text
        item = create.json()
        assert item["amount_toman"] == 500_000
        assert item["jalali_date"] == "1404/01/01"

        listing = client.get("/api/expenses?month=1404-01&person=ramin")
        assert listing.status_code == 200
        assert listing.json()["count"] == 1

        summary = client.get("/api/summary?month=1404-01")
        assert summary.status_code == 200
        assert summary.json()["total_toman"] == 500_000
        assert summary.json()["by_person"]["ramin"] == 500_000

        update = client.patch(
            f"/api/expenses/{item['id']}",
            headers=headers,
            json={
                "amount_thousands": 1245,
                "person": "mana",
                "category": "pet",
                "jalali_date": "1404/01/02",
                "note": "ویرایش API",
            },
        )
        assert update.status_code == 200
        assert update.json()["amount_toman"] == 1_245_000

        delete_response = client.delete(f"/api/expenses/{item['id']}", headers=headers)
        assert delete_response.status_code == 204
        assert client.get("/api/expenses?month=1404-01").json()["count"] == 0


def test_mutations_require_csrf_and_invalid_amount_is_rejected():
    with TestClient(app, base_url="https://testserver") as client:
        login(client)
        response = client.post(
            "/api/expenses",
            json={
                "amount_thousands": 500,
                "person": "ramin",
                "category": "daily",
                "jalali_date": "1404/01/01",
                "note": "بدون csrf",
            },
        )
        assert response.status_code == 403

        csrf = client.cookies.get("kharj_csrf")
        invalid = client.post(
            "/api/expenses",
            headers={"X-CSRF-Token": csrf},
            json={
                "amount_thousands": 0,
                "person": "ramin",
                "category": "daily",
                "jalali_date": "1404/01/01",
                "note": "نامعتبر",
            },
        )
        assert invalid.status_code == 422


def test_logout_invalidates_session():
    with TestClient(app, base_url="https://testserver") as client:
        csrf = login(client)
        assert client.get("/api/auth/me").json()["authenticated"] is True
        assert client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf}).status_code in (204, None)
        assert client.get("/api/auth/me").json()["authenticated"] is False
