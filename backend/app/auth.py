from datetime import timedelta
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import AuthSession, User
from .security import is_expired, new_token, token_hash, tokens_equal, utc_now

settings = get_settings()
DbSession = Annotated[Session, Depends(get_db)]


def _unauthorized(detail: str = "برای انجام این کار وارد شوید.") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def create_session(response: Response, db: Session, user: User) -> None:
    raw_session = new_token()
    raw_csrf = new_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=token_hash(raw_session),
        csrf_token_hash=token_hash(raw_csrf),
        expires_at=utc_now() + timedelta(hours=settings.session_ttl_hours),
    )
    db.add(session)
    db.commit()
    response.set_cookie(
        settings.session_cookie_name,
        raw_session,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite if settings.cookie_samesite in ("lax", "strict", "none") else "lax",
        domain=settings.cookie_domain,
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        raw_csrf,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite if settings.cookie_samesite in ("lax", "strict", "none") else "lax",
        domain=settings.cookie_domain,
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )


def clear_session(response: Response, db: Session, request: Request) -> None:
    raw_session = request.cookies.get(settings.session_cookie_name)
    if raw_session:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash(raw_session)))
        db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


def get_current_session(request: Request, db: DbSession) -> AuthSession:
    raw_session = request.cookies.get(settings.session_cookie_name)
    if not raw_session:
        raise _unauthorized()
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(raw_session)))
    if session is None or is_expired(session.expires_at):
        if session is not None:
            db.delete(session)
            db.commit()
        raise _unauthorized()
    return session


def get_current_user(session: Annotated[AuthSession, Depends(get_current_session)]) -> User:
    if not session.user.is_active:
        raise _unauthorized("این حساب غیرفعال است.")
    return session.user


def require_csrf(request: Request, session: Annotated[AuthSession, Depends(get_current_session)]) -> None:
    raw_csrf = request.cookies.get(settings.csrf_cookie_name)
    header_csrf = request.headers.get("X-CSRF-Token")
    if not raw_csrf or not header_csrf:
        raise HTTPException(status_code=403, detail="درخواست امنیتی نامعتبر است.")
    if not tokens_equal(token_hash(raw_csrf), session.csrf_token_hash) or not tokens_equal(raw_csrf, header_csrf):
        raise HTTPException(status_code=403, detail="درخواست امنیتی نامعتبر است.")
