from app.schemas import SAVINGS_ASSET_OPTIONS, SAVINGS_ASSET_TYPES, SavingsAssetPayload


def test_savings_schema_exposes_only_approved_asset_options():
    assert SAVINGS_ASSET_TYPES == ("cash", "crypto", "gold")
    assert {key for key, _ in SAVINGS_ASSET_OPTIONS} == {"cash", "crypto", "gold"}


def test_savings_payload_rejects_unapproved_asset_and_mismatched_symbol():
    base = {
        "asset_type": "cash",
        "symbol": "USD",
        "title": "دلار",
        "quantity": "100",
        "unit": "دلار",
        "owner": "shared",
        "as_of_jalali_date": "1405/05/26",
    }
    try:
        SavingsAssetPayload(**{**base, "asset_type": "other"})
    except Exception:
        pass
    else:
        raise AssertionError("other must be rejected")

    try:
        SavingsAssetPayload(**{**base, "symbol": "BTC", "title": "BTC", "unit": "BTC"})
    except Exception:
        pass
    else:
        raise AssertionError("cash/BTC mismatch must be rejected")


def test_savings_payload_accepts_each_approved_asset():
    for asset_type, option in (("cash", "USD"), ("crypto", "BTC"), ("gold", "GRAM")):
        options = next(options for group, options in SAVINGS_ASSET_OPTIONS if group == asset_type)
        option_data = next(item for item in options if item["symbol"] == option)
        payload = SavingsAssetPayload(
            asset_type=asset_type,
            symbol=option_data["symbol"],
            title=option_data["title"],
            quantity="1.5",
            unit=option_data["unit"],
            owner="shared",
            as_of_jalali_date="1405/05/26",
        )
        assert payload.asset_type == asset_type
        assert payload.symbol == option_data["symbol"]
        assert payload.unit == option_data["unit"]


def test_savings_api_rejects_mismatched_asset_fields(client):
    from test_savings_api import asset_payload, login

    csrf = login(client)
    response = client.post(
        "/api/savings/assets",
        headers={"X-CSRF-Token": csrf},
        json=asset_payload(asset_type="cash", symbol="BTC", title="BTC", unit="BTC"),
    )
    assert response.status_code == 422
