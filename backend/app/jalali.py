import re
from datetime import date, timedelta

import jdatetime

MONTH_NAMES = (
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
)


def normalize_digits(value: str) -> str:
    persian = "۰۱۲۳۴۵۶۷۸۹"
    arabic = "٠١٢٣٤٥٦٧٨٩"
    return (
        str(value)
        .translate(str.maketrans(persian, "0123456789"))
        .translate(str.maketrans(arabic, "0123456789"))
        .replace("٬", "")
        .replace("،", "")
        .replace(",", "")
        .strip()
    )


def parse_jalali(value: str) -> date:
    normalized = normalize_digits(value).replace("-", "/")
    match = re.fullmatch(r"(\d{4})/(\d{1,2})/(\d{1,2})", normalized)
    if not match:
        raise ValueError("تاریخ را به شکل ۱۴۰۴/۰۱/۰۱ وارد کنید.")
    year, month, day = map(int, match.groups())
    if not 1200 <= year <= 1600 or not 1 <= month <= 12 or not 1 <= day <= 31:
        raise ValueError("تاریخ شمسی واردشده معتبر نیست.")
    try:
        return jdatetime.date(year, month, day).togregorian()
    except ValueError as exc:
        raise ValueError("تاریخ شمسی واردشده معتبر نیست.") from exc


def to_jalali(value: date) -> str:
    converted = jdatetime.date.fromgregorian(date=value)
    return f"{converted.year:04d}/{converted.month:02d}/{converted.day:02d}"


def parse_month(value: str) -> tuple[int, int]:
    normalized = normalize_digits(value)
    match = re.fullmatch(r"(\d{4})-(\d{1,2})", normalized)
    if not match:
        raise ValueError("ماه باید به شکل ۱۴۰۴-۰۱ باشد.")
    year, month = map(int, match.groups())
    if not 1200 <= year <= 1600 or not 1 <= month <= 12:
        raise ValueError("ماه شمسی واردشده معتبر نیست.")
    return year, month


def month_range(value: str) -> tuple[date, date]:
    year, month = parse_month(value)
    start = jdatetime.date(year, month, 1).togregorian()
    if month == 12:
        next_start = jdatetime.date(year + 1, 1, 1).togregorian()
    else:
        next_start = jdatetime.date(year, month + 1, 1).togregorian()
    return start, next_start


def current_month() -> str:
    return to_jalali(date.today())[:7].replace("/", "-")


def month_label(value: str) -> str:
    year, month = parse_month(value)
    return f"{MONTH_NAMES[month - 1]} {year}"
