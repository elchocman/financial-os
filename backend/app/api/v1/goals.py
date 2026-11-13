from fastapi import APIRouter, HTTPException, Depends

from app.api.v1.deps import get_current_user
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.database import get_db
from app.models.schemas import Goal, GoalCreate

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("/", response_model=list[Goal])
async def list_goals(current_user: dict = Depends(get_current_user)):
    db = get_db()
    response = db.table("goals").select("*").eq("user_id", current_user["id"]).order("created_at", desc=False).execute()
    return [_row_to_goal(row) for row in response.data]


@router.post("/", response_model=Goal, status_code=201)
async def create_goal(body: GoalCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    monthly = _calc_monthly_needed(body)
    row = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": body.name,
        "target_amount": float(body.target_amount),
        "current_amount": float(body.current_amount),
        "target_date": body.target_date.isoformat() if body.target_date else None,
        "monthly_savings_needed": float(monthly) if monthly else None,
        "currency": body.currency,
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
    }
    db.table("goals").insert(row).execute()
    return _row_to_goal(row)


@router.put("/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, body: GoalCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    monthly = _calc_monthly_needed(body)
    update = {
        "name": body.name,
        "target_amount": float(body.target_amount),
        "current_amount": float(body.current_amount),
        "target_date": body.target_date.isoformat() if body.target_date else None,
        "monthly_savings_needed": float(monthly) if monthly else None,
        "currency": body.currency,
    }
    response = db.table("goals").update(update).eq("id", goal_id).eq("user_id", current_user["id"]).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    return _row_to_goal(response.data[0])


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    db.table("goals").delete().eq("id", goal_id).eq("user_id", current_user["id"]).execute()


def _calc_monthly_needed(goal: GoalCreate) -> Decimal | None:
    if not goal.target_date:
        return None
    remaining = float(goal.target_amount - goal.current_amount)
    if remaining <= 0:
        return Decimal("0")
    today = date.today()
    months = (goal.target_date.year - today.year) * 12 + (goal.target_date.month - today.month)
    if months <= 0:
        return None
    return Decimal(str(round(remaining / months, 0)))


def _row_to_goal(row: dict) -> Goal:
    target = Decimal(str(row["target_amount"]))
    current = Decimal(str(row.get("current_amount") or 0))
    progress = round(float(current / target * 100), 1) if target > 0 else 0.0
    return Goal(
        id=row["id"],
        name=row["name"],
        target_amount=target,
        current_amount=current,
        target_date=row.get("target_date"),
        monthly_savings_needed=(
            Decimal(str(row["monthly_savings_needed"]))
            if row.get("monthly_savings_needed")
            else None
        ),
        currency=row.get("currency", "CLP"),
        progress_pct=progress,
        status=row.get("status", "active"),
        created_at=row.get("created_at", datetime.utcnow()),
    )
