from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_csrf
from ..db import get_db
from ..jalali import parse_jalali
from ..models import SavingsAsset, User
from ..schemas import SavingsAssetListResponse, SavingsAssetPayload, SavingsAssetResponse, savings_asset_response

router = APIRouter()


def get_asset(asset_id: int, user: User, db: Session) -> SavingsAsset:
    asset = db.scalar(select(SavingsAsset).where(SavingsAsset.id == asset_id, SavingsAsset.household_id == user.household_id))
    if asset is None:
        raise HTTPException(status_code=404, detail="دارایی پیدا نشد.")
    return asset


@router.get("/assets", response_model=SavingsAssetListResponse)
def list_assets(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SavingsAssetListResponse:
    assets = list(
        db.scalars(
            select(SavingsAsset)
            .where(SavingsAsset.household_id == user.household_id)
            .order_by(SavingsAsset.asset_type, SavingsAsset.title, SavingsAsset.id)
        )
    )
    return SavingsAssetListResponse(items=[savings_asset_response(asset) for asset in assets], count=len(assets))


@router.get("/assets/{asset_id}", response_model=SavingsAssetResponse)
def get_asset_route(asset_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SavingsAssetResponse:
    return savings_asset_response(get_asset(asset_id, user, db))


@router.post("/assets", response_model=SavingsAssetResponse, status_code=201)
def create_asset(
    payload: SavingsAssetPayload,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> SavingsAssetResponse:
    asset = SavingsAsset(
        household_id=user.household_id,
        created_by_id=user.id,
        asset_type=payload.asset_type,
        symbol=payload.symbol.strip().upper(),
        title=payload.title.strip(),
        quantity=payload.quantity,
        unit=payload.unit.strip(),
        owner=payload.owner,
        as_of_date=parse_jalali(payload.as_of_jalali_date),
        note=payload.note.strip(),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return savings_asset_response(asset)


@router.patch("/assets/{asset_id}", response_model=SavingsAssetResponse)
def update_asset(
    asset_id: int,
    payload: SavingsAssetPayload,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> SavingsAssetResponse:
    asset = get_asset(asset_id, user, db)
    asset.asset_type = payload.asset_type
    asset.symbol = payload.symbol.strip().upper()
    asset.title = payload.title.strip()
    asset.quantity = payload.quantity
    asset.unit = payload.unit.strip()
    asset.owner = payload.owner
    asset.as_of_date = parse_jalali(payload.as_of_jalali_date)
    asset.note = payload.note.strip()
    db.commit()
    db.refresh(asset)
    return savings_asset_response(asset)


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    _: None = Depends(require_csrf),
    db: Session = Depends(get_db),
) -> Response:
    asset = get_asset(asset_id, user, db)
    db.delete(asset)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
