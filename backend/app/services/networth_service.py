import logging
from datetime import datetime, date
from decimal import Decimal

from postgrest.exceptions import APIError
from app.database import get_db
from app.models.schemas import NetWorthSnapshot, DashboardKPIs
from app.collectors.fintual.fintual_goals import get_fintual_total
from app.collectors.racional.racional_valuation import get_racional_total
from app.collectors.binance.binance_funding import get_bitcoin_total_clp

logger = logging.getLogger(__name__)


def get_latest_snapshot(user_id: str) -> NetWorthSnapshot | None:
    """Fetch the most recent net worth snapshot from Supabase for a user."""
    db = get_db()
    response = (
        db.table("networth_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    row = response.data[0]
    return _row_to_snapshot(row)


def get_snapshot_history(user_id: str, days: int = 90) -> list[NetWorthSnapshot]:
    """Fetch the last N days of net worth history for charting for a user."""
    db = get_db()
    response = (
        db.table("networth_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=False)
        .limit(days)
        .execute()
    )

    return [_row_to_snapshot(row) for row in response.data]


def snapshot_exists_today(user_id: str) -> bool:
    today = date.today().isoformat()
    db = get_db()
    response = (
        db.table("networth_snapshots")
        .select("date")
        .eq("user_id", user_id)
        .eq("date", today)
        .execute()
    )
    return len(response.data) > 0


def save_daily_snapshot(user_id: str) -> NetWorthSnapshot:
    """
    Fetch live data from all platforms and persist today's snapshot for the user.
    This is the core of what save_snapshot.py did — now as a service method.
    """
    if snapshot_exists_today(user_id):
        logger.warning("Snapshot already exists for today — skipping")
        return get_latest_snapshot(user_id)

    logger.info("Collecting data from all platforms...")

    try:
        fintual = get_fintual_total()
    except Exception as e:
        logger.warning(f"Fintual collection failed, using 0: {e}")
        fintual = 0

    try:
        racional = get_racional_total()
    except Exception as e:
        logger.warning(f"Racional collection failed, using 0: {e}")
        racional = 0

    try:
        binance = get_bitcoin_total_clp()
    except Exception as e:
        logger.warning(f"Binance collection failed, using 0: {e}")
        binance = 0

    net_worth = fintual + racional + binance
    today = date.today().isoformat()

    row = {
        "user_id": user_id,
        "date": today,
        "fintual": fintual,
        "racional": racional,
        "binance": binance,
        "total_assets": net_worth,
        "total_liabilities": 0,
        "net_worth": net_worth,
        "currency": "CLP",
    }

    db = get_db()
    try:
        db.table("networth_snapshots").insert(row).execute()
    except APIError as exc:
        message = getattr(exc, "message", "")
        if "duplicate key value violates unique constraint" not in message:
            raise
    logger.info(f"✅ Snapshot saved for user {user_id}: net_worth={net_worth:,} CLP")

    return _row_to_snapshot(row)


def get_dashboard_kpis(user_id: str) -> DashboardKPIs:
    """Build KPI block for the Command Center dashboard for a user."""
    latest = get_latest_snapshot(user_id)
    history = get_snapshot_history(user_id, days=31)

    if latest is None:
        latest = save_daily_snapshot(user_id)

    net_worth = latest.net_worth
    change_30d = None
    change_pct_30d = None

    if len(history) >= 2:
        oldest = history[0]
        change_30d = net_worth - oldest.net_worth
        if oldest.net_worth > 0:
            change_pct_30d = round(float(change_30d / oldest.net_worth * 100), 2)

    # Enrich with cashflow data (non-fatal if transactions table is empty)
    monthly_income = None
    monthly_expenses = None
    savings_rate = None
    emergency_fund_months = None

    try:
        from app.services.cashflow_service import (
            get_cashflow_summary, get_emergency_fund_months
        )
        cf = get_cashflow_summary(user_id, months=1)
        monthly_income = cf.total_income
        monthly_expenses = cf.total_expenses
        savings_rate = cf.savings_rate

        if cf.total_expenses > 0:
            # Use cash holdings from assets for emergency fund calc
            # Fallback: use a fraction of net worth as approximation
            emergency_fund_months = get_emergency_fund_months(
                monthly_expenses=cf.total_expenses,
                total_liquid_assets=net_worth * Decimal("0.15"),  # rough estimate
            )
    except Exception as e:
        logger.debug(f"Cashflow KPIs not available: {e}")

    return DashboardKPIs(
        net_worth=net_worth,
        net_worth_change_30d=change_30d,
        net_worth_change_pct_30d=change_pct_30d,
        total_assets=latest.total_assets,
        total_liabilities=latest.total_liabilities,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        savings_rate=savings_rate,
        emergency_fund_months=emergency_fund_months,
        currency="CLP",
        last_updated=datetime.utcnow(),
    )


def _row_to_snapshot(row: dict) -> NetWorthSnapshot:
    return NetWorthSnapshot(
        date=row["date"],
        net_worth=Decimal(str(row.get("net_worth") or row.get("total") or 0)),
        total_assets=Decimal(str(row.get("total_assets") or row.get("total") or 0)),
        total_liabilities=Decimal(str(row.get("total_liabilities") or 0)),
        fintual=Decimal(str(row["fintual"])) if row.get("fintual") else None,
        racional=Decimal(str(row["racional"])) if row.get("racional") else None,
        binance=Decimal(str(row["binance"])) if row.get("binance") else None,
        currency=row.get("currency", "CLP"),
    )
