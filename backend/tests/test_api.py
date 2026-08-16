from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient, username: str = "ramin") -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": f"{username}-test-password-123"})
    assert response.status_code == 200, response.text
    csrf = client.cookies.get("kharj_csrf")
    assert csrf
    return csrf


def test_login_create_filter_summary_update_delete_flow(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}
    create = client.post("/api/expenses", headers=headers, json={"amount_thousands": 500, "person": "ramin", "category": "daily", "jalali_date": "۱۴۰۴/۰۱/۰۱", "note": "تست API"})
    assert create.status_code == 201, create.text
    item = create.json()
    assert item["amount_toman"] == 500_000
    assert item["jalali_date"] == "1404/01/01"
    assert client.get("/api/expenses?month=1404-01&person=ramin").json()["count"] == 1
    summary = client.get("/api/summary?month=1404-01")
    assert summary.status_code == 200
    assert summary.json()["total_toman"] == 500_000
    assert summary.json()["by_person"]["ramin"] == 500_000
    update = client.patch(f"/api/expenses/{item['id']}", headers=headers, json={"amount_thousands": 1245, "person": "mana", "category": "pet", "jalali_date": "1404/01/02", "note": "ویرایش API"})
    assert update.status_code == 200
    assert update.json()["amount_toman"] == 1_245_000
    assert client.delete(f"/api/expenses/{item['id']}", headers=headers).status_code == 204
    assert client.get("/api/expenses?month=1404-01").json()["count"] == 0


def test_mutations_require_csrf_and_invalid_amount_is_rejected(client):
    login(client)
    response = client.post("/api/expenses", json={"amount_thousands": 500, "person": "ramin", "category": "daily", "jalali_date": "1404/01/01", "note": "بدون csrf"})
    assert response.status_code == 403
    csrf = client.cookies.get("kharj_csrf")
    invalid = client.post("/api/expenses", headers={"X-CSRF-Token": csrf}, json={"amount_thousands": 0, "person": "ramin", "category": "daily", "jalali_date": "1404/01/01", "note": "نامعتبر"})
    assert invalid.status_code == 422


def test_logout_invalidates_session(client):
    csrf = login(client)
    assert client.get("/api/auth/me").json()["authenticated"] is True
    assert client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf}).status_code in (204, None)
    assert client.get("/api/auth/me").json()["authenticated"] is False
