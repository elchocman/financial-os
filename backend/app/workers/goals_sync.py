"""
Goals Auto-Progress Service
────────────────────────────
Automatically updates goal `current_amount` from live financial data.

Strategy per goal type (detected from goal name/tag):
  - Goals tagged/named with a platform → pulls platform portfolio value
  - Goals tagged "net_worth" → uses latest net worth snapshot
  - Goals tagged "savings" or "cash" → sums cash-type assets from balance sheet
  - All others → stays at manual (user updates via UI)

If no tag matches, no-op — never overwrites a manual goal without intent.

Run schedule: daily (in daily_runner.py, step 5 — after snapshot saved).

Usage:
  python -m app.workers.goals_sync
"""
import logging
from datetime import date, datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

# Keywords that link a goal to an auto-updateable data source
SOURCE_KEYWORDS = {
    "net_worth":  ["patrimonio", "net worth", "networth", "total"],
    "fintual":    ["fintual"],
    "racional":   ["racional"],
    "binance":    ["bitcoin", "btc", "binance", "crypto"],
    "savings":    ["ahorro", "savings", "cash", "efectivo", "liquido", "líquido"],
}


def detect_goal_source(goal_name: str) -> str | None:
    """
    Infer the data source for a goal from its name (case-insensitive).
    Returns the source key or None if no match (manual goal).
    """
    name_lower = goal_name.lower()
    for source, keywords in SOURCE_KEYWORDS.items():
        if any(kw in name_lower for kw in keywords):
            return source
    return None


def get_source_values() -> dict[str, Decimal]:
    """
    Gather current values from all auto-updatable sources.
    Returns a dict of source_key → value in CLP.
    """
    values: dict[str, Decimal] = {}

    # Net worth from latest snapshot
    try:
        from app.services.networth_service import get_latest_snapshot
        snap = get_latest_snapshot()
        if snap:
            values["net_worth"] = snap.net_worth
    except Exception as e:
        logger.warning(f"Could not fetch net worth for goals: {e}")

    # Platform totals from latest holdings snapshot
    try:
        from app.repositories.holdings_repo import get_holdings_by_platform, get_latest_prices_bulk
        from app.utils.fx import get_usd_clp_rate

        fx = Decimal(str(get_usd_clp_rate()))
        for platform in ["fintual", "racional", "binance"]:
            holdings = get_holdings_by_platform(platform)
            if not holdings:
                continue
            tickers = [h["ticker"] for h in holdings if h.get("ticker")]
            prices = get_latest_prices_bulk(tickers) if tickers else {}
            total = Decimal("0")
            for h in holdings:
                qty = Decimal(str(h.get("quantity") or 0))
                ticker = h.get("ticker")
                currency = h.get("currency", "USD")
                if ticker and ticker in prices:
                    price = Decimal(str(prices[ticker]))
                    price_clp = price * fx if currency == "USD" else price
                    total += qty * price_clp
            if total > 0:
                values[platform] = total
    except Exception as e:
        logger.warning(f"Could not fetch platform values for goals: {e}")

    # Cash / liquid assets from balance sheet
    try:
        from app.services.balance_sheet_service import get_all_assets
        assets = get_all_assets()
        cash_total = sum(
            a.current_value for a in assets
            if not a.is_liability and a.type == "cash"
        )
        if cash_total > 0:
            values["savings"] = cash_total
    except Exception as e:
        logger.warning(f"Could not fetch cash assets for goals: {e}")

    return values


def run() -> int:
    """
    Update current_amount for all auto-trackable goals.
    Returns the number of goals updated.
    """
    from app.database import get_db

    db = get_db()
    goals_resp = db.table("goals").select("*").eq("status", "active").execute()
    goals = goals_resp.data

    if not goals:
        logger.info("No active goals to update")
        return 0

    source_values = get_source_values()
    logger.info(f"Source values: { {k: f'{v:,.0f}' for k, v in source_values.items()} }")

    updated = 0
    for goal in goals:
        source = detect_goal_source(goal["name"])
        if source is None or source not in source_values:
            logger.debug(f"  Goal '{goal['name']}' → manual (no auto-source)")
            continue

        new_amount = float(source_values[source])
        target = float(goal["target_amount"])
        new_progress = round(min(new_amount / target * 100, 100), 1) if target > 0 else 0.0
        new_status = "achieved" if new_progress >= 100 else "active"

        try:
            db.table("goals").update({
                "current_amount": new_amount,
                "status": new_status,
            }).eq("id", goal["id"]).execute()

            logger.info(
                f"  ✓ '{goal['name']}' → {new_amount:,.0f} CLP "
                f"({new_progress:.1f}%) [{source}]"
            )
            updated += 1
        except Exception as e:
            logger.error(f"  ✗ Failed to update goal '{goal['name']}': {e}")

    logger.info(f"✅ Goals sync complete: {updated}/{len(goals)} updated")
    return updated


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    try:
        n = run()
        logger.info(f"Updated {n} goals")
    except Exception as e:
        logger.error(f"❌ Goals sync failed: {e}")
        sys.exit(1)
