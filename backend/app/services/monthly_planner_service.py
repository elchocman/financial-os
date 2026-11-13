from datetime import date, datetime
from decimal import Decimal
import uuid

from app.database import get_db
from app.models.schemas import (
    CategoryBudget,
    CategoryBudgetInput,
    MonthlyPlanner,
    MonthlyPlannerSummary,
    MonthlyPlannerUpdate,
    RecurringExpense,
    RecurringExpenseInput,
)


def get_monthly_planner(user_id: str, month: str | None = None) -> MonthlyPlanner:
    month_date = _parse_month(month)
    month_key = month_date.strftime("%Y-%m")
    db = get_db()

    plan_resp = (
        db.table("monthly_plans")
        .select("*")
        .eq("user_id", user_id)
        .eq("month", month_date.isoformat())
        .limit(1)
        .execute()
    )
    plan_row = plan_resp.data[0] if plan_resp.data else None

    recurring_resp = (
        db.table("recurring_expenses")
        .select("*")
        .eq("user_id", user_id)
        .order("day_of_month", desc=False)
        .order("name", desc=False)
        .execute()
    )
    recurring = [_row_to_recurring(row) for row in recurring_resp.data]

    budgets_resp = (
        db.table("category_budgets")
        .select("*, categories(name)")
        .eq("user_id", user_id)
        .eq("month", month_date.isoformat())
        .order("label", desc=False)
        .execute()
    )
    budget_rows = budgets_resp.data

    tx_resp = (
        db.table("transactions")
        .select("type, amount, category_id, categories(name)")
        .eq("user_id", user_id)
        .gte("date", month_date.isoformat())
        .lt("date", _next_month(month_date).isoformat())
        .execute()
    )
    tx_rows = tx_resp.data

    actual_income = Decimal("0")
    actual_expenses = Decimal("0")
    actual_by_category_id: dict[str, Decimal] = {}
    actual_by_label: dict[str, Decimal] = {}

    for row in tx_rows:
        amount = Decimal(str(row.get("amount") or 0))
        if row.get("type") == "income":
            actual_income += amount
        elif row.get("type") == "expense":
            actual_expenses += amount
            category_id = row.get("category_id")
            category_name = ((row.get("categories") or {}).get("name") or "Other").strip()
            label_key = category_name.lower()
            actual_by_label[label_key] = actual_by_label.get(label_key, Decimal("0")) + amount
            if category_id:
                actual_by_category_id[category_id] = actual_by_category_id.get(category_id, Decimal("0")) + amount

    category_budgets = [_row_to_budget(row, month_key, actual_by_category_id, actual_by_label) for row in budget_rows]

    planned_income = Decimal(str(plan_row.get("planned_income") or 0)) if plan_row else Decimal("0")
    savings_target = Decimal(str(plan_row.get("savings_target") or 0)) if plan_row else Decimal("0")
    recurring_total = sum((item.amount for item in recurring if item.is_active), Decimal("0"))
    budgeted_variable_total = sum((item.planned_amount for item in category_budgets), Decimal("0"))
    available_to_budget = planned_income - savings_target - recurring_total
    remaining_to_budget = available_to_budget - budgeted_variable_total
    actual_free_cash = actual_income - actual_expenses

    return MonthlyPlanner(
        month=month_key,
        planned_income=planned_income,
        savings_target=savings_target,
        notes=plan_row.get("notes") if plan_row else None,
        recurring_expenses=recurring,
        category_budgets=category_budgets,
        summary=MonthlyPlannerSummary(
            planned_income=planned_income,
            savings_target=savings_target,
            recurring_total=recurring_total,
            budgeted_variable_total=budgeted_variable_total,
            available_to_budget=available_to_budget,
            remaining_to_budget=remaining_to_budget,
            actual_income=actual_income,
            actual_expenses=actual_expenses,
            actual_free_cash=actual_free_cash,
        ),
    )


def save_monthly_planner(user_id: str, month: str | None, payload: MonthlyPlannerUpdate) -> MonthlyPlanner:
    month_date = _parse_month(month)
    db = get_db()
    now = datetime.utcnow().isoformat()

    existing = (
        db.table("monthly_plans")
        .select("id")
        .eq("user_id", user_id)
        .eq("month", month_date.isoformat())
        .limit(1)
        .execute()
    )
    plan_row = {
        "user_id": user_id,
        "month": month_date.isoformat(),
        "planned_income": float(payload.planned_income),
        "savings_target": float(payload.savings_target),
        "notes": payload.notes,
        "updated_at": now,
    }
    if existing.data:
        db.table("monthly_plans").update(plan_row).eq("id", existing.data[0]["id"]).execute()
    else:
        plan_row["id"] = str(uuid.uuid4())
        plan_row["created_at"] = now
        db.table("monthly_plans").insert(plan_row).execute()

    _replace_recurring_expenses(user_id, payload.recurring_expenses)
    _replace_category_budgets(user_id, month_date, payload.category_budgets)

    return get_monthly_planner(user_id, month_date.strftime("%Y-%m"))


def _replace_recurring_expenses(user_id: str, items: list[RecurringExpenseInput]) -> None:
    db = get_db()
    existing_resp = db.table("recurring_expenses").select("id").eq("user_id", user_id).execute()
    existing_ids = {row["id"] for row in existing_resp.data}
    incoming_ids = {item.id for item in items if item.id}
    now = datetime.utcnow().isoformat()

    for item in items:
        row = {
            "user_id": user_id,
            "name": item.name,
            "amount": float(item.amount),
            "currency": item.currency,
            "category_id": item.category_id,
            "day_of_month": item.day_of_month,
            "is_active": item.is_active,
            "updated_at": now,
        }
        if item.id and item.id in existing_ids:
            db.table("recurring_expenses").update(row).eq("id", item.id).eq("user_id", user_id).execute()
        else:
            row["id"] = str(uuid.uuid4())
            row["created_at"] = now
            db.table("recurring_expenses").insert(row).execute()

    for obsolete_id in existing_ids - incoming_ids:
        db.table("recurring_expenses").delete().eq("id", obsolete_id).eq("user_id", user_id).execute()


def _replace_category_budgets(user_id: str, month_date: date, items: list[CategoryBudgetInput]) -> None:
    db = get_db()
    existing_resp = (
        db.table("category_budgets")
        .select("id")
        .eq("user_id", user_id)
        .eq("month", month_date.isoformat())
        .execute()
    )
    existing_ids = {row["id"] for row in existing_resp.data}
    incoming_ids = {item.id for item in items if item.id}
    now = datetime.utcnow().isoformat()

    for item in items:
        row = {
            "user_id": user_id,
            "month": month_date.isoformat(),
            "label": item.label,
            "planned_amount": float(item.planned_amount),
            "category_id": item.category_id,
            "updated_at": now,
        }
        if item.id and item.id in existing_ids:
            db.table("category_budgets").update(row).eq("id", item.id).eq("user_id", user_id).execute()
        else:
            row["id"] = str(uuid.uuid4())
            row["created_at"] = now
            db.table("category_budgets").insert(row).execute()

    for obsolete_id in existing_ids - incoming_ids:
        db.table("category_budgets").delete().eq("id", obsolete_id).eq("user_id", user_id).execute()


def _row_to_recurring(row: dict) -> RecurringExpense:
    return RecurringExpense(
        id=row["id"],
        name=row["name"],
        amount=Decimal(str(row.get("amount") or 0)),
        category_id=row.get("category_id"),
        day_of_month=int(row.get("day_of_month") or 1),
        currency=row.get("currency", "CLP"),
        is_active=bool(row.get("is_active", True)),
        created_at=row.get("created_at", datetime.utcnow()),
        updated_at=row.get("updated_at", datetime.utcnow()),
    )


def _row_to_budget(
    row: dict,
    month_key: str,
    actual_by_category_id: dict[str, Decimal],
    actual_by_label: dict[str, Decimal],
) -> CategoryBudget:
    category_id = row.get("category_id")
    fallback_name = ((row.get("categories") or {}).get("name") or row.get("label") or "Other").strip()
    actual_amount = (
        actual_by_category_id.get(category_id, Decimal("0"))
        if category_id
        else actual_by_label.get((row.get("label") or fallback_name).strip().lower(), Decimal("0"))
    )
    planned_amount = Decimal(str(row.get("planned_amount") or 0))
    return CategoryBudget(
        id=row["id"],
        month=month_key,
        label=row.get("label") or fallback_name,
        planned_amount=planned_amount,
        category_id=category_id,
        actual_amount=actual_amount,
        remaining_amount=planned_amount - actual_amount,
        created_at=row.get("created_at", datetime.utcnow()),
        updated_at=row.get("updated_at", datetime.utcnow()),
    )


def _parse_month(month: str | None) -> date:
    raw = month or date.today().strftime("%Y-%m")
    parsed = datetime.strptime(raw, "%Y-%m").date()
    return parsed.replace(day=1)


def _next_month(current: date) -> date:
    if current.month == 12:
        return current.replace(year=current.year + 1, month=1, day=1)
    return current.replace(month=current.month + 1, day=1)
