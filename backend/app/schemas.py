from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .jalali import parse_jalali, to_jalali

PEOPLE = ("ramin", "mana")
CATEGORIES = (
    "daily",
    "installment",
    "rent",
    "car",
    "home",
    "debt",
    "pet",
    "miscellaneous",
)
SAVINGS_ASSET_TYPES = ("cash", "crypto", "gold")
SAVINGS_ASSET_OPTIONS = (
    ("cash", ({"symbol": "USD", "title": "دلار", "unit": "دلار"}, {"symbol": "TOMAN", "title": "تومان", "unit": "تومان"})),
    ("crypto", ({"symbol": "USDT", "title": "تتر", "unit": "USDT"}, {"symbol": "BTC", "title": "بیت‌کوین", "unit": "BTC"}, {"symbol": "ETH", "title": "اتریوم", "unit": "ETH"}, {"symbol": "BNB", "title": "بایننس کوین", "unit": "BNB"}, {"symbol": "SOL", "title": "سولانا", "unit": "SOL"})),
    ("gold", ({"symbol": "QUARTER_COIN", "title": "ربع سکه", "unit": "عدد"}, {"symbol": "HALF_COIN", "title": "نیم سکه", "unit": "عدد"}, {"symbol": "FULL_COIN", "title": "تمام سکه", "unit": "عدد"}, {"symbol": "GRAM", "title": "گرم", "unit": "گرم"})),
)
SAVINGS_OWNERS = ("ramin", "mana", "shared")


def _savings_option(asset_type: str, symbol: str) -> dict | None:
    for option_type, options in SAVINGS_ASSET_OPTIONS:
        if option_type == asset_type:
            return next((option for option in options if option["symbol"] == symbol), None)
    return None


def _validate_savings_selection(asset_type: str, symbol: str, title: str, unit: str) -> None:
    option = _savings_option(asset_type, symbol.upper())
    if option is None or option["title"] != title.strip() or option["unit"] != unit.strip():
        raise ValueError("نوع و دارایی انتخاب‌شده معتبر نیستند.")


class LoginRequest(BaseModel):
    username: Literal["ramin", "mana"]
    password: str = Field(min_length=1, max_length=256)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    person: Literal["ramin", "mana"]


class LoginResponse(BaseModel):
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)


class ChangePasswordResponse(BaseModel):
    message: str


class ComparisonResponse(BaseModel):
    available: bool
    current_total_toman: int
    previous_total_toman: int | None = None
    percent: int | None = None
    direction: Literal["less", "more", "same", "unavailable"]
    previous_month: str | None = None
    previous_month_label: str | None = None


class ExpensePayload(BaseModel):
    amount_thousands: int = Field(gt=0, le=100_000_000)
    person: Literal["ramin", "mana"]
    category: Literal[
        "daily", "installment", "rent", "car", "home", "debt", "pet", "miscellaneous"
    ]
    jalali_date: str = Field(min_length=8, max_length=10)
    note: str = Field(default="", max_length=1000)

    @field_validator("jalali_date")
    @classmethod
    def validate_jalali_date(cls, value: str) -> str:
        parse_jalali(value)
        return value


class ExpenseResponse(BaseModel):
    id: int
    amount_thousands: int
    amount_toman: int
    person: Literal["ramin", "mana"]
    category: Literal[
        "daily", "installment", "rent", "car", "home", "debt", "pet", "miscellaneous"
    ]
    jalali_date: str
    note: str
    created_at: datetime
    updated_at: datetime


class ExpenseListResponse(BaseModel):
    items: list[ExpenseResponse]
    count: int


class SummaryResponse(BaseModel):
    month: str
    month_label: str
    total_toman: int
    count: int
    by_person: dict[str, int]
    by_category: dict[str, int]
    comparison: ComparisonResponse


def expense_response(expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=expense.id,
        amount_thousands=expense.amount_toman // 1000,
        amount_toman=expense.amount_toman,
        person=expense.person,
        category=expense.category,
        jalali_date=to_jalali(expense.expense_date),
        note=expense.note or "",
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )


class HealthResponse(BaseModel):
    status: str
    database: str


class AuthResponse(BaseModel):
    authenticated: bool
    user: UserResponse | None = None


class FilterParams(BaseModel):
    month: str | None = None
    person: str | None = None
    category: str | None = None
    q: str | None = None

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: str | None) -> str | None:
        if value is not None:
            from .jalali import parse_month

            parse_month(value)
        return value


class SavingsAssetPayload(BaseModel):
    asset_type: Literal["cash", "crypto", "gold"]
    symbol: str = Field(min_length=1, max_length=24)
    title: str = Field(min_length=1, max_length=120)
    quantity: Decimal = Field(gt=0, le=Decimal("999999999999.999999999999"), max_digits=24, decimal_places=12)
    unit: str = Field(min_length=1, max_length=24)
    owner: Literal["ramin", "mana", "shared"]
    as_of_jalali_date: str = Field(min_length=8, max_length=10)
    note: str = Field(default="", max_length=1000)

    @field_validator("symbol", "title", "unit")
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("این فیلد نمی‌تواند خالی باشد.")
        return value

    @model_validator(mode="after")
    def validate_savings_selection(self):
        _validate_savings_selection(self.asset_type, self.symbol, self.title, self.unit)
        return self

    @field_validator("as_of_jalali_date")
    @classmethod
    def validate_savings_date(cls, value: str) -> str:
        parse_jalali(value)
        return value


class SavingsAssetResponse(BaseModel):
    id: int
    asset_type: Literal["cash", "crypto", "gold"]
    symbol: str
    title: str
    quantity: Decimal
    unit: str
    owner: Literal["ramin", "mana", "shared"]
    as_of_jalali_date: str
    note: str
    created_at: datetime
    updated_at: datetime


def savings_asset_response(asset) -> SavingsAssetResponse:
    return SavingsAssetResponse(
        id=asset.id,
        asset_type=asset.asset_type,
        symbol=asset.symbol,
        title=asset.title,
        quantity=asset.quantity.normalize(),
        unit=asset.unit,
        owner=asset.owner,
        as_of_jalali_date=to_jalali(asset.as_of_date),
        note=asset.note or "",
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


class SavingsAssetListResponse(BaseModel):
    items: list[SavingsAssetResponse]
    count: int
