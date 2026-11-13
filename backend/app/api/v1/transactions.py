from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import datetime
from decimal import Decimal
import uuid

from app.api.v1.deps import get_current_user

from app.database import get_db
from app.models.schemas import (
    Transaction, TransactionCreate, TransactionUpdate,
    Category, CashflowSummary, MonthlySummary, CategorySummary,
)
from app.services.cashflow_service import (
    get_cashflow_summary,
    get_monthly_summaries,
    get_expense_by_category,
)

router = APIRouter(prefix="/transactions", tags=["Cashflow"])


@router.get("/", response_model=list[Transaction])
async def list_transactions(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    type: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
):
    try:
        db = get_db()
        query = db.table("transactions").select("*, accounts(name)").order("date", desc=True)
        query = query.eq("user_id", current_user["id"])
        if type:
            query = query.eq("type", type)
        if category_id:
            query = query.eq("category_id", category_id)
        if from_date:
            query = query.gte("date", from_date)
        if to_date:
            query = query.lte("date", to_date)
        response = query.range(offset, offset + limit - 1).execute()
        return [_row_to_transaction(row) for row in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Transaction, status_code=201)
async def create_transaction(body: TransactionCreate, current_user: dict = Depends(get_current_user)):
    try:
        db = get_db()
        row = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "date": body.date.isoformat(),
            "amount": float(body.amount),
            "currency": body.currency,
            "type": body.type,
            "account_id": body.account_id,
            "category_id": body.category_id,
            "description": body.description,
            "is_recurring": body.is_recurring,
            "source": "manual",
            "created_at": datetime.utcnow().isoformat(),
        }
        db.table("transactions").insert(row).execute()
        return _row_to_transaction(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, body: TransactionUpdate, current_user: dict = Depends(get_current_user)):
    try:
        db = get_db()
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if "date" in update:
            update["date"] = update["date"].isoformat()
        if "amount" in update:
            update["amount"] = float(update["amount"])
        response = db.table("transactions").update(update).eq("id", transaction_id).eq("user_id", current_user["id"]).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Transaction not found")
        fetch_response = db.table("transactions").select("*, accounts(name)").eq("id", transaction_id).eq("user_id", current_user["id"]).limit(1).execute()
        return _row_to_transaction(fetch_response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    try:
        db = get_db()
        db.table("transactions").delete().eq("id", transaction_id).eq("user_id", current_user["id"]).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=CashflowSummary)
async def cashflow_summary(current_user: dict = Depends(get_current_user), months: int = Query(default=1, ge=1, le=12)):
    try:
        return get_cashflow_summary(current_user["id"], months=months)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly", response_model=list[MonthlySummary])
async def monthly_summaries(current_user: dict = Depends(get_current_user), months: int = Query(default=12, ge=1, le=24)):
    try:
        return get_monthly_summaries(current_user["id"], months=months)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-category", response_model=list[CategorySummary])
async def by_category(current_user: dict = Depends(get_current_user), months: int = Query(default=1, ge=1, le=12)):
    try:
        return get_expense_by_category(current_user["id"], months=months)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories", response_model=list[Category])
async def list_categories(type: str | None = Query(default=None)):
    try:
        db = get_db()
        query = db.table("categories").select("*").order("name")
        if type:
            query = query.eq("type", type)
        response = query.execute()
        return [
            Category(
                id=row["id"], name=row["name"], type=row["type"],
                icon=row.get("icon"), color=row.get("color"), parent_id=row.get("parent_id"),
            )
            for row in response.data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _row_to_transaction(row: dict) -> Transaction:
    return Transaction(
        id=row["id"],
        date=row["date"],
        amount=Decimal(str(row["amount"])),
        currency=row.get("currency", "CLP"),
        type=row["type"],
        account_id=row.get("account_id"),
        account_name=((row.get("accounts") or {}).get("name") if isinstance(row.get("accounts"), dict) else None),
        category_id=row.get("category_id"),
        description=row.get("description"),
        is_recurring=row.get("is_recurring", False),
        amount_base_currency=(
            Decimal(str(row["amount_base_currency"])) if row.get("amount_base_currency") else None
        ),
        created_at=row.get("created_at", datetime.utcnow()),
    )
