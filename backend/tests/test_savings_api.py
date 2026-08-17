from decimal import Decimal

from fastapi.testclient import TestClient

from app.models import Household, User
from app.rate_limit import _attempts
from app.security import hash_password
from conftest import TestSession


def login(client: TestClient, username: str = "ramin", password: str | None = None) -> str:
    password = password or f"{username}-test-password-123"
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    csrf = client.cookies.get("kharj_csrf")
    assert csrf
    return csrf


def asset_payload(**overrides):
    payload = {
        "asset_type": "crypto",
        "symbol": "BTC",
        "title": "بیت‌کوین",
        "quantity": "0.50000000",
        "unit": "BTC",
        "owner": "shared",
        "as_of_jalali_date": "1405/05/26",
        "note": "کیف پول مشترک",
    }
    payload.update(overrides)
    return payload


def test_savings_asset_crud_preserves_decimal_precision_and_is_separate_from_expenses(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}

    create = client.post("/api/savings/assets", headers=headers, json=asset_payload())
    assert create.status_code == 201, create.text
    item = create.json()
    assert item["quantity"] == "0.5"
    assert item["symbol"] == "BTC"
    assert item["owner"] == "shared"
    assert item["as_of_jalali_date"] == "1405/05/26"

    listed = client.get("/api/savings/assets")
    assert listed.status_code == 200
    assert listed.json()["count"] == 1
    assert listed.json()["items"][0]["quantity"] == "0.5"

    update = client.patch(
        f"/api/savings/assets/{item['id']}",
        headers=headers,
        json=asset_payload(quantity="0.750000000000", note="اصلاح موجودی"),
    )
    assert update.status_code == 200, update.text
    assert update.json()["quantity"] == "0.75"
    assert update.json()["note"] == "اصلاح موجودی"

    # Savings must not appear in the expense domain or its summary.
    assert client.get("/api/expenses?month=1405-05").json()["count"] == 0
    summary = client.get("/api/summary?month=1405-05")
    assert summary.status_code == 200
    assert summary.json()["total_toman"] == 0

    assert client.delete(f"/api/savings/assets/{item['id']}", headers=headers).status_code == 204
    assert client.get("/api/savings/assets").json()["count"] == 0


def test_savings_validates_quantity_date_and_asset_fields(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}

    for invalid in (
        {"quantity": "0"},
        {"quantity": "-1"},
        {"quantity": "0.1234567890123"},
        {"as_of_jalali_date": "1405/13/01"},
        {"symbol": ""},
        {"owner": "someone-else"},
        {"asset_type": "shares"},
    ):
        response = client.post("/api/savings/assets", headers=headers, json=asset_payload(**invalid))
        assert response.status_code == 422, (invalid, response.text)


def test_savings_tenant_isolation_returns_not_found_for_another_household(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}
    created = client.post("/api/savings/assets", headers=headers, json=asset_payload())
    assert created.status_code == 201, created.text
    asset_id = created.json()["id"]

    db = TestSession()
    other_household = Household(name="خانه دیگر")
    db.add(other_household)
    db.flush()
    other_user = User(
        username="other-user",
        person="ramin",
        household_id=other_household.id,
        password_hash=hash_password("other-user-test-password-123"),
    )
    db.add(other_user)
    db.commit()
    db.close()

    # Move the existing mana account before creating a fresh session for it.
    db = TestSession()
    mana = db.query(User).filter(User.username == "mana").one()
    mana.household_id = other_household.id
    db.commit()
    db.close()

    # This test switches identity after the first login; clear only the test IP bucket.
    _attempts.clear()
    other = client.post("/api/auth/login", json={"username": "mana", "password": "mana-test-password-123"})
    assert other.status_code == 200, other.text
    assert other.json()["user"]["username"] == "mana"
    assert client.get("/api/savings/assets").json()["count"] == 0
    assert client.get(f"/api/savings/assets/{asset_id}").status_code == 404
