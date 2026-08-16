from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_csrf
from ..db import get_db
from ..jalali import current_month, month_label, month_range, parse_jalali, previous_month
from ..models import Expense, User
from ..schemas import ComparisonResponse, ExpenseListResponse, ExpensePayload, ExpenseResponse, SummaryResponse, expense_response

router = APIRouter()


@router.get("/expenses", response_model=ExpenseListResponse)
def list_expenses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    month: str | None = Query(default=None),
    person: str | None = Query(default=None),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> ExpenseListResponse:
    statement = select(Expense).where(Expense.household_id == user.household_id)
    if month:
        try:
            start, end = month_range(month)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        statement = statement.where(Expense.expense_date >= start, Expense.expense_date < end)
    if person and person != "all":
        statement = statement.where(Expense.person == person)
    if category and category != "all":
        statement = statement.where(Expense.category == category)
    if q:
        statement = statement.where(Expense.note.ilike(f"%{q}%"))
    statement = statement.order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    items = list(db.scalars(statement))
    return ExpenseListResponse(items=[expense_response(item) for item in items], count=len(items))


@router.post("/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(
    payload: ExpensePayload,
    request: Request,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    expense = Expense(
        household_id=user.household_id,
        created_by_id=user.id,
        amount_toman=payload.amount_thousands * 1000,
        person=payload.person,
        category=payload.category,
        expense_date=parse_jalali(payload.jalali_date),
        note=payload.note.strip(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense_response(expense)


@router.patch("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    payload: ExpensePayload,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    expense = db.scalar(select(Expense).where(Expense.id == expense_id, Expense.household_id == user.household_id))
    if expense is None:
        raise HTTPException(status_code=404, detail="هزینه پیدا نشد.")
    expense.amount_toman = payload.amount_thousands * 1000
    expense.person = payload.person
    expense.category = payload.category
    expense.expense_date = parse_jalali(payload.jalali_date)
    expense.note = payload.note.strip()
    db.commit()
    db.refresh(expense)
    return expense_response(expense)


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> Response:
    expense = db.scalar(select(Expense).where(Expense.id == expense_id, Expense.household_id == user.household_id))
    if expense is None:
        raise HTTPException(status_code=404, detail="هزینه پیدا نشد.")
    db.delete(expense)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/summary", response_model=SummaryResponse)
def summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    month: str | None = Query(default=None),
    person: str | None = Query(default=None),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> SummaryResponse:
    selected_month = month or current_month()
    try:
        start, end = month_range(selected_month)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    statement = select(Expense).where(
        Expense.household_id == user.household_id,
        Expense.expense_date >= start,
        Expense.expense_date < end,
    )
    if person and person != "all":
        statement = statement.where(Expense.person == person)
    if category and category != "all":
        statement = statement.where(Expense.category == category)
    if q:
        statement = statement.where(Expense.note.ilike(f"%{q}%"))
    expenses = list(db.scalars(statement))
    by_person = {"ramin": 0, "mana": 0}
    by_category = {key: 0 for key in ("daily", "installment", "rent", "car", "home", "debt", "pet", "miscellaneous")}
    for expense in expenses:
        by_person[expense.person] += expense.amount_toman
        by_category[expense.category] += expense.amount_toman
    previous_key = previous_month(selected_month)
    previous_start, previous_end = month_range(previous_key)
    previous_statement = select(Expense).where(
        Expense.household_id == user.household_id,
        Expense.expense_date >= previous_start,
        Expense.expense_date < previous_end,
    )
    if person and person != "all":
        previous_statement = previous_statement.where(Expense.person == person)
    if category and category != "all":
        previous_statement = previous_statement.where(Expense.category == category)
    if q:
        previous_statement = previous_statement.where(Expense.note.ilike(f"%{q}%"))
    previous_expenses = list(db.scalars(previous_statement))
    previous_total = sum(expense.amount_toman for expense in previous_expenses)
    current_total = sum(by_person.values())
    comparison = ComparisonResponse(available=bool(previous_expenses), current_total_toman=current_total, previous_total_toman=previous_total or None, percent=None, direction="unavailable", previous_month=previous_key, previous_month_label=month_label(previous_key))
    if previous_expenses:
        if current_total == previous_total:
            comparison.direction = "same"
            comparison.percent = 0
        elif current_total < previous_total:
            comparison.direction = "less"
            comparison.percent = round((previous_total - current_total) * 100 / previous_total)
        else:
            comparison.direction = "more"
            comparison.percent = round((current_total - previous_total) * 100 / previous_total)
    return SummaryResponse(
        month=selected_month,
        month_label=month_label(selected_month),
        total_toman=sum(by_person.values()),
        count=len(expenses),
        by_person=by_person,
        by_category=by_category,
        comparison=comparison,
    )
