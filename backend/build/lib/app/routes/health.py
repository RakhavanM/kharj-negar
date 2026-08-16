from fastapi import APIRouter
from sqlalchemy import text

from ..db import SessionLocal
from ..schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(status="ok", database="ok")
    finally:
        db.close()
