import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .config import get_settings

_attempts: dict[str, deque[float]] = defaultdict(deque)
settings = get_settings()


def check_login_rate_limit(request: Request) -> None:
    now = time.monotonic()
    key = request.client.host if request.client else "unknown"
    bucket = _attempts[key]
    cutoff = now - settings.login_rate_limit_window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= settings.login_rate_limit_attempts:
        raise HTTPException(status_code=429, detail="تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید.")
    bucket.append(now)
