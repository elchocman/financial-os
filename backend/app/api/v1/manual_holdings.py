from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.models.schemas import ManualHoldingCreate, ManualHoldingUpdate, ManualHoldingRead
from app.repositories.holdings_repo import (
    get_manual_holdings,
    create_manual_holding,
    update_manual_holding,
    delete_manual_holding,
)

router = APIRouter(prefix="/portfolio/holdings", tags=["Manual Holdings"])


@router.get("/", response_model=list[ManualHoldingRead])
async def list_holdings(
    platform: str = "racional",
    current_user: dict = Depends(get_current_user),
):
    try:
        return get_manual_holdings(platform=platform, user_id=current_user["id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ManualHoldingRead, status_code=201)
async def add_holding(
    body: ManualHoldingCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        return create_manual_holding(current_user["id"], body.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{holding_id}", response_model=ManualHoldingRead)
async def edit_holding(
    holding_id: str,
    body: ManualHoldingUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = update_manual_holding(
            current_user["id"],
            holding_id,
            body.model_dump(exclude_unset=True),
        )
        if not result:
            raise HTTPException(status_code=404, detail="Holding not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{holding_id}", status_code=204)
async def remove_holding(
    holding_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        deleted = delete_manual_holding(current_user["id"], holding_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Holding not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
