"""
Cashflow Service
────────────────
Business logic for income, expenses, savings rate, and
monthly summaries. Powers both the Cashflow Engine page
and the Command Center KPI widgets (savings rate, emergency fund).
"""
import logging
from datetime import date, datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.models.schemas import (
    CashflowSummary,
    MonthlySummary,
    CategorySummary,
)

logger = logging.getLogger(__name__)


def get_cashflow_summary(user_id: str, months: int = 1) -> CashflowSummary:
    """
    Aggregate income and expenses for the last N months.
    months=1 → current month only.
    months=3 → rolling 3-month window.
    """
    db = get_db()
    since = (date.today() - relativedelta(months=months)).isoformat()

    response = (
        db.table("transactions")
        .select("type, amount, currency, date, category_id")
        .eq("user_id", user_id)
        .gte("date", since)
        .execute()
    )

    rows = response.data
    total_income = Decimal("0")
    total_expenses = Decimal("0")

    for row in rows:
        amount = Decimal(str(row["amount"]))
        if row["type"] == "income":
            total_income += amount
        elif row["type"] == "expense":
            total_expenses += amount

    net = total_income - total_expenses
    savings_rate = (
        round(float(net / total_income * 100), 1)
        if total_income > 0
        else 0.0
    )

    return CashflowSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net=net,
        savings_rate=savings_rate,
        currency="CLP",
        period_months=months,
        from_date=since,
        to_date=date.today().isoformat(),
    )


def get_monthly_summaries(user_id: str, months: int = 12) -> list[MonthlySummary]:
    """
    Return income vs expense totals for each of the last N months.
    Used for the cashflow bar chart.
    """
    db = get_db()
    since = (date.today() - relativedelta(months=months)).isoformat()

    response = (
        db.table("transactions")
        .select("type, amount, date")
        .eq("user_id", user_id)
        .gte("date", since)
        .order("date", desc=False)
        .execute()
    )

    # Group by YYYY-MM
    buckets: dict[str, dict] = {}
    for row in response.data:
        month_key = row["date"][:7]  # "2025-03"
        if month_key not in buckets:
            buckets[month_key] = {"income": Decimal("0"), "expenses": Decimal("0")}
        amount = Decimal(str(row["amount"]))
        if row["type"] == "income":
            buckets[month_key]["income"] += amount
        elif row["type"] == "expense":
            buckets[month_key]["expenses"] += amount

    summaries = []
    for month_key in sorted(buckets.keys()):
        b = buckets[month_key]
        net = b["income"] - b["expenses"]
        summaries.append(MonthlySummary(
            month=month_key,
            income=b["income"],
            expenses=b["expenses"],
            net=net,
            savings_rate=(
                round(float(net / b["income"] * 100), 1)
                if b["income"] > 0 else 0.0
            ),
        ))

    return summaries


def get_expense_by_category(user_id: str, months: int = 1) -> list[CategorySummary]:
    """
    Expenses grouped by category for the last N months.
    Used for the donut chart on the cashflow page.
    """
    db = get_db()
    since = (date.today() - relativedelta(months=months)).isoformat()

    # Join transactions with categories
    response = (
        db.table("transactions")
        .select("amount, category_id, categories(name, color, icon)")
        .eq("user_id", user_id)
        .eq("type", "expense")
        .gte("date", since)
        .execute()
    )

    buckets: dict[str, dict] = {}
    for row in response.data:
        cat = row.get("categories") or {}
        cat_name = cat.get("name") or "Uncategorized"
        cat_id = row.get("category_id") or "uncategorized"

        if cat_id not in buckets:
            buckets[cat_id] = {
                "name": cat_name,
                "color": cat.get("color") or "#4a5a6a",
                "icon": cat.get("icon") or "·",
                "total": Decimal("0"),
                "count": 0,
            }
        buckets[cat_id]["total"] += Decimal(str(row["amount"]))
        buckets[cat_id]["count"] += 1

    total_expenses = sum(b["total"] for b in buckets.values())

    result = []
    for cat_id, b in sorted(buckets.items(), key=lambda x: x[1]["total"], reverse=True):
        pct = (
            round(float(b["total"] / total_expenses * 100), 1)
            if total_expenses > 0 else 0.0
        )
        result.append(CategorySummary(
            category_id=cat_id,
            name=b["name"],
            color=b["color"],
            icon=b["icon"],
            total=b["total"],
            percentage=pct,
            transaction_count=b["count"],
        ))

    return result


def get_emergency_fund_months(monthly_expenses: Decimal, total_liquid_assets: Decimal) -> float:
    """
    Calculate how many months of expenses are covered by liquid assets.
    Used in Command Center KPI widget.
    """
    if monthly_expenses <= 0:
        return 0.0
    return round(float(total_liquid_assets / monthly_expenses), 1)
