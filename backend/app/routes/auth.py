from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import clear_session, create_session, get_current_session
from ..db import get_db
from ..models import User
from ..rate_limit import check_login_rate_limit
from ..schemas import AuthResponse, LoginRequest, LoginResponse, UserResponse
from ..security import verify_password

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    check_login_rate_limit(request)
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not user.is_active or not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور نادرست است.")
    create_session(response, db, user)
    return LoginResponse(user=UserResponse.model_validate(user))


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    clear_session(response, db, request)
    response.status_code = 204
    return response


@router.get("/me", response_model=AuthResponse)
def me(request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        session = get_current_session(request, db)
    except HTTPException:
        return AuthResponse(authenticated=False, user=None)
    return AuthResponse(authenticated=True, user=UserResponse.model_validate(session.user))
