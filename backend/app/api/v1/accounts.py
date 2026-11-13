from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.deps import get_current_user
from app.models.schemas import AccountCreate, AccountRead, AccountUpdate
from app.services.account_service import create_account, delete_account, list_accounts, update_account

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("/", response_model=list[AccountRead])
async def get_accounts(current_user: dict = Depends(get_current_user)):
    try:
        return list_accounts(current_user["id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=AccountRead, status_code=201)
async def add_account(body: AccountCreate, current_user: dict = Depends(get_current_user)):
    try:
        return create_account(current_user["id"], body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{account_id}", response_model=AccountRead)
async def edit_account(account_id: str, body: AccountUpdate, current_user: dict = Depends(get_current_user)):
    try:
        result = update_account(current_user["id"], account_id, body)
        if not result:
            raise HTTPException(status_code=404, detail="Account not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{account_id}", status_code=204)
async def remove_account(account_id: str, current_user: dict = Depends(get_current_user)):
    try:
        delete_account(current_user["id"], account_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
