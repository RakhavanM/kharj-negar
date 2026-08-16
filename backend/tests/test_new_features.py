from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient, password: str = "ramin-test-password-123") -> str:
    response = client.post("/api/auth/login", json={"username": "ramin", "password": password})
    assert response.status_code == 200, response.text
    return client.cookies.get("kharj_csrf")


def expense_payload(amount: int, month_date: str, note: str) -> dict:
    return {"amount_thousands": amount, "person": "ramin", "category": "daily", "jalali_date": month_date, "note": note}


def test_change_password_requires_current_password_and_allows_new_login(client):
    csrf = login(client)
    response = client.post("/api/auth/change-password", headers={"X-CSRF-Token": csrf}, json={"current_password": "wrong-password", "new_password": "ramin-new-password-123"})
    assert response.status_code == 400
    response = client.post("/api/auth/change-password", headers={"X-CSRF-Token": csrf}, json={"current_password": "ramin-test-password-123", "new_password": "ramin-new-password-123"})
    assert response.status_code == 200, response.text
    client.post("/api/auth/logout", headers={"X-CSRF-Token": client.cookies.get("kharj_csrf")})
    assert client.post("/api/auth/login", json={"username": "ramin", "password": "ramin-new-password-123"}).status_code == 200


def test_summary_reports_previous_month_comparison(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}
    previous = client.post("/api/expenses", headers=headers, json=expense_payload(1000, "1403/12/15", "ماه قبل"))
    current = client.post("/api/expenses", headers=headers, json=expense_payload(500, "1404/01/15", "ماه جاری"))
    assert previous.status_code == 201 and current.status_code == 201
    summary = client.get("/api/summary?month=1404-01")
    assert summary.status_code == 200
    comparison = summary.json()["comparison"]
    assert comparison["available"] is True
    assert comparison["percent"] == 50
    assert comparison["direction"] == "less"
    assert comparison["previous_total_toman"] == 1_000_000
    csrf = client.cookies.get("kharj_csrf")
    for item in (previous.json(), current.json()):
        assert client.delete(f"/api/expenses/{item['id']}", headers={"X-CSRF-Token": csrf}).status_code == 204
