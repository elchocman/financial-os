from fastapi import APIRouter, HTTPException, Depends

from app.api.v1.deps import get_current_user
from decimal import Decimal

from app.models.schemas import BalanceSheet, AssetCreate, AssetItem
from app.services.balance_sheet_service import (
    build_balance_sheet,
    create_asset,
    update_asset,
    delete_asset,
    get_all_assets,
)

router = APIRouter(prefix="/balance-sheet", tags=["Balance Sheet"])


@router.get("/", response_model=BalanceSheet)
async def get_balance_sheet(current_user: dict = Depends(get_current_user)):
    """
    Full balance sheet: assets, liabilities, net worth.
    Injects live portfolio value as the investments bucket.
    """
    try:
        # Pull live portfolio total to inject into balance sheet
        portfolio_value = None
        try:
            from app.services.portfolio_service import get_all_holdings
            holdings = get_all_holdings()
            portfolio_value = sum(h["current_value_clp"] for h in holdings)
        except Exception:
            pass  # Non-fatal — show balance sheet without live portfolio

        return build_balance_sheet(current_user["id"], portfolio_value_clp=portfolio_value)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assets", response_model=list[AssetItem])
async def list_assets(current_user: dict = Depends(get_current_user)):
    """List all manually tracked assets and liabilities."""
    try:
        return get_all_assets(current_user["id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets", response_model=AssetItem, status_code=201)
async def add_asset(body: AssetCreate, current_user: dict = Depends(get_current_user)):
    """Add a new asset or liability to the balance sheet."""
    try:
        return create_asset(current_user["id"], body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/assets/{asset_id}", response_model=AssetItem)
async def edit_asset(asset_id: str, body: AssetCreate, current_user: dict = Depends(get_current_user)):
    """Update an asset's value or metadata."""
    try:
        result = update_asset(current_user["id"], asset_id, body)
        if not result:
            raise HTTPException(status_code=404, detail="Asset not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/assets/{asset_id}", status_code=204)
async def remove_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
    """Remove an asset from the balance sheet."""
    try:
        delete_asset(current_user["id"], asset_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
