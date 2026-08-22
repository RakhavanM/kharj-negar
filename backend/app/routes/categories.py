import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_csrf
from ..db import get_db
from ..models import Category, Expense, User
from ..schemas import CategoryListResponse, CategoryPayload, CategoryResponse

router = APIRouter()


def normalize_category_name(value: str) -> str:
    return " ".join(unicodedata.normalize("NFC", value).split())


def category_response(category: Category, in_use: bool = False) -> CategoryResponse:
    return CategoryResponse(
        id=category.id,
        code=category.code,
        name=category.name,
        is_active=category.is_active,
        sort_order=category.sort_order,
        version=category.version,
        in_use=in_use,
    )


def get_category(category_id: int, user: User, db: Session) -> tuple[Category, bool]:
    category = db.scalar(
        select(Category).where(Category.id == category_id, Category.household_id == user.household_id)
    )
    if category is None:
        raise HTTPException(status_code=404, detail="دسته‌بندی پیدا نشد.")
    in_use = db.scalar(
        select(func.count(Expense.id)).where(
            Expense.household_id == user.household_id,
            Expense.category == category.code,
        )
    ) > 0
    return category, in_use


def ensure_category_available(code: str, user: User, db: Session) -> None:
    category = db.scalar(
        select(Category).where(
            Category.household_id == user.household_id,
            Category.code == code,
            Category.is_active.is_(True),
        )
    )
    if category is None:
        raise HTTPException(status_code=422, detail="دسته‌بندی انتخاب‌شده معتبر یا فعال نیست.")


@router.get("", response_model=CategoryListResponse)
def list_categories(
    include_inactive: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryListResponse:
    statement = select(Category).where(Category.household_id == user.household_id)
    if not include_inactive:
        statement = statement.where(Category.is_active.is_(True))
    categories = list(db.scalars(statement.order_by(Category.sort_order, Category.id)))
    used_codes = {
        code
        for (code,) in db.execute(
            select(Expense.category).where(Expense.household_id == user.household_id).distinct()
        )
    }
    return CategoryListResponse(
        items=[category_response(item, item.code in used_codes) for item in categories],
        count=len(categories),
    )


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category_route(
    category_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryResponse:
    category, in_use = get_category(category_id, user, db)
    return category_response(category, in_use)


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(
    payload: CategoryPayload,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> CategoryResponse:
    name = normalize_category_name(payload.name)
    if not name:
        raise HTTPException(status_code=422, detail="نام دسته‌بندی نمی‌تواند خالی باشد.")
    existing = db.scalar(
        select(Category).where(
            Category.household_id == user.household_id,
            func.lower(Category.name) == name.lower(),
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="این دسته‌بندی قبلاً وجود دارد.")
    base = re.sub(r"[^a-zA-Z0-9]+", "-", unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()).strip("-").lower()
    code = base or "category"
    prefix = code
    suffix = 2
    while db.scalar(
        select(Category.id).where(Category.household_id == user.household_id, Category.code == code)
    ) is not None:
        code = f"{prefix}-{suffix}"
        suffix += 1
    max_order = db.scalar(select(func.max(Category.sort_order)).where(Category.household_id == user.household_id)) or 0
    category = Category(
        household_id=user.household_id,
        created_by_id=user.id,
        code=code,
        name=name,
        is_active=True,
        sort_order=max_order + 10,
        version=1,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category_response(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryPayload,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> CategoryResponse:
    category, in_use = get_category(category_id, user, db)
    if payload.version is not None and payload.version != category.version:
        raise HTTPException(status_code=409, detail="این دسته‌بندی توسط کاربر دیگری تغییر کرده است.")
    name = normalize_category_name(payload.name)
    duplicate = db.scalar(
        select(Category).where(
            Category.household_id == user.household_id,
            func.lower(Category.name) == name.lower(),
            Category.id != category.id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="این دسته‌بندی قبلاً وجود دارد.")
    values = {"name": name, "version": category.version + 1}
    statement = update(Category).where(Category.id == category.id, Category.household_id == user.household_id)
    if payload.version is not None:
        statement = statement.where(Category.version == payload.version)
    result = db.execute(statement.values(**values))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="این دسته‌بندی توسط کاربر دیگری تغییر کرده است.")
    db.commit()
    db.refresh(category)
    return category_response(category, in_use)


@router.delete("/{category_id}", response_model=CategoryResponse)
def archive_category(
    category_id: int,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> CategoryResponse:
    category, in_use = get_category(category_id, user, db)
    active_count = db.scalar(
        select(func.count(Category.id)).where(
            Category.household_id == user.household_id,
            Category.is_active.is_(True),
        )
    )
    if category.is_active and active_count <= 1:
        raise HTTPException(status_code=409, detail="حداقل یک دسته‌بندی فعال باید باقی بماند.")
    category.is_active = False
    category.version += 1
    db.commit()
    db.refresh(category)
    return category_response(category, in_use)


@router.post("/{category_id}/restore", response_model=CategoryResponse)
def restore_category(
    category_id: int,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> CategoryResponse:
    category, in_use = get_category(category_id, user, db)
    category.is_active = True
    category.version += 1
    db.commit()
    db.refresh(category)
    return category_response(category, in_use)
