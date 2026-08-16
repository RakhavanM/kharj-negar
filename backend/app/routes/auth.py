from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import clear_session, create_session, get_current_session, get_current_user, require_csrf
from ..db import get_db
from ..models import User
from ..rate_limit import check_login_rate_limit
from ..schemas import AuthResponse, ChangePasswordRequest, ChangePasswordResponse, LoginRequest, LoginResponse, UserResponse
from ..security import hash_password, verify_password

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


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> ChangePasswordResponse:
    if not verify_password(user.password_hash, payload.current_password):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی نادرست است.")
    if verify_password(user.password_hash, payload.new_password):
        raise HTTPException(status_code=400, detail="رمز عبور جدید باید با رمز فعلی متفاوت باشد.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return ChangePasswordResponse(message="رمز عبور با موفقیت تغییر کرد.")


@router.get("/me", response_model=AuthResponse)
def me(request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        session = get_current_session(request, db)
    except HTTPException:
        return AuthResponse(authenticated=False, user=None)
    return AuthResponse(authenticated=True, user=UserResponse.model_validate(session.user))
