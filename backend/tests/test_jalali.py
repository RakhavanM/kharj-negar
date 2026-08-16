from datetime import date

import pytest

from app.jalali import current_month, month_range, parse_jalali, to_jalali


def test_parse_and_format_jalali_date_round_trip() -> None:
    value = parse_jalali("۱۴۰۴/۰۱/۰۱")
    assert value == date(2025, 3, 21)
    assert to_jalali(value) == "1404/01/01"


def test_invalid_jalali_date_is_rejected() -> None:
    with pytest.raises(ValueError):
        parse_jalali("۱۴۰۴/۱۳/۰۱")
    with pytest.raises(ValueError):
        parse_jalali("۱۴۰۴/۰۱/۳۲")


def test_month_range_is_half_open() -> None:
    start, end = month_range("۱۴۰۴-۰۱")
    assert start == date(2025, 3, 21)
    assert end == date(2025, 4, 21)


def test_current_month_has_expected_shape() -> None:
    assert len(current_month()) == 7
    assert current_month()[4] == "-"
