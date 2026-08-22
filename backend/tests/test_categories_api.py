from fastapi.testclient import TestClient


def login(client: TestClient, username: str = "ramin") -> str:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": f"{username}-test-password-123"},
    )
    assert response.status_code == 200, response.text
    csrf = client.cookies.get("kharj_csrf")
    assert csrf
    return csrf


def category_by_code(response, code: str) -> dict:
    return next(item for item in response.json()["items"] if item["code"] == code)


def test_category_crud_rename_and_duplicate_validation(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}

    listed = client.get("/api/categories")
    assert listed.status_code == 200, listed.text
    assert "daily" in {item["code"] for item in listed.json()["items"]}

    created = client.post("/api/categories", headers=headers, json={"name": "سرگرمی"})
    assert created.status_code == 201, created.text
    category = created.json()
    assert category["name"] == "سرگرمی"
    assert category["is_active"] is True

    duplicate = client.post("/api/categories", headers=headers, json={"name": "  سرگرمی  "})
    assert duplicate.status_code == 409, duplicate.text

    renamed = client.patch(
        f"/api/categories/{category['id']}",
        headers=headers,
        json={"name": "تفریح", "version": category["version"]},
    )
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["name"] == "تفریح"
    assert renamed.json()["version"] == category["version"] + 1

    stale = client.patch(
        f"/api/categories/{category['id']}",
        headers=headers,
        json={"name": "نام قدیمی", "version": category["version"]},
    )
    assert stale.status_code == 409, stale.text


def test_category_used_by_expense_is_archived_and_cannot_be_deleted_as_last_active(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}

    created = client.post("/api/categories", headers=headers, json={"name": "دسته موقت"})
    assert created.status_code == 201, created.text
    category = created.json()

    expense = client.post(
        "/api/expenses",
        headers=headers,
        json={
            "amount_thousands": 100,
            "person": "ramin",
            "category": category["code"],
            "jalali_date": "1404/01/01",
            "note": "هزینه دسته آزمایشی",
        },
    )
    assert expense.status_code == 201, expense.text

    archived = client.delete(f"/api/categories/{category['id']}", headers=headers)
    assert archived.status_code == 200, archived.text
    assert archived.json()["is_active"] is False
    assert archived.json()["in_use"] is True

    renamed = client.patch(
        f"/api/categories/{category['id']}",
        headers=headers,
        json={"name": "نام جدید", "version": archived.json()["version"]},
    )
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["name"] == "نام جدید"

    active_options = client.get("/api/categories").json()["items"]
    assert category["code"] not in {item["code"] for item in active_options}
    all_options = client.get("/api/categories?include_inactive=true").json()["items"]
    assert category["code"] in {item["code"] for item in all_options}

    rejected = client.post(
        "/api/expenses",
        headers=headers,
        json={
            "amount_thousands": 100,
            "person": "ramin",
            "category": category["code"],
            "jalali_date": "1404/01/02",
            "note": "نباید ثبت شود",
        },
    )
    assert rejected.status_code == 422, rejected.text


def test_category_can_be_archived_even_when_it_has_history_and_restored(client):
    csrf = login(client)
    headers = {"X-CSRF-Token": csrf}
    created = client.post("/api/categories", headers=headers, json={"name": "قابل بازگشت"})
    category = created.json()
    assert client.delete(f"/api/categories/{category['id']}", headers=headers).status_code == 200
    restored = client.post(f"/api/categories/{category['id']}/restore", headers=headers)
    assert restored.status_code == 200, restored.text
    assert restored.json()["is_active"] is True


def test_category_management_is_household_scoped_and_requires_csrf(client):
    login(client)
    no_csrf = client.post("/api/categories", json={"name": "بدون csrf"})
    assert no_csrf.status_code == 403
    assert client.get("/api/categories").status_code == 200
    assert client.get("/api/categories?include_inactive=true").status_code == 200
    assert client.get("/api/categories/999999").status_code == 404
