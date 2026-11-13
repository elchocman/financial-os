"""
PnL Service
───────────
Calculates profit and loss for each holding and the overall portfolio.

PnL logic:
  - For holdings with avg_cost set: PnL = (current_price - avg_cost) * quantity
  - For funds (Fintual) without avg_cost: PnL not calculable, shown as None
  - Portfolio PnL = sum of all holding PnLs where calculable
  - Performance % = PnL / total_cost_basis * 100

Data flow:
  1. Get live holdings from collectors (current prices)
  2. Enrich with avg_cost from DB (if available)
  3. Calculate PnL per holding
  4. Aggregate to portfolio level
"""
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional

from app.repositories.holdings_repo import (
    get_all_holdings_from_db,
    get_price_history,
    get_latest_prices_bulk,
)
from app.repositories.holdings_repo import get_fx_rate_history
from app.models.schemas import (
    HoldingPnL,
    PortfolioPerformance,
    PerformanceDataPoint,
)
from app.utils.fx import usd_to_clp_decimal, get_usd_clp_rate
from app.utils.numbers import to_decimal

logger = logging.getLogger(__name__)


def calculate_holding_pnl(
    holding: dict,
    current_price_clp: Decimal,
) -> HoldingPnL:
    """
    Calculate PnL for a single holding.

    Args:
        holding: DB row from holdings table
        current_price_clp: current price converted to CLP
    """
    quantity = Decimal(str(holding["quantity"]))
    current_value_clp = current_price_clp * quantity
    avg_cost = holding.get("avg_cost")

    pnl_clp = None
    pnl_pct = None
    cost_basis_clp = None

    if avg_cost and float(avg_cost) > 0:
        avg_cost_dec = Decimal(str(avg_cost))
        currency = holding.get("currency", "USD")

        # Convert avg_cost to CLP
        if currency == "USD":
            fx_rate = Decimal(str(get_usd_clp_rate()))
            avg_cost_clp = avg_cost_dec * fx_rate
        else:
            avg_cost_clp = avg_cost_dec

        cost_basis_clp = avg_cost_clp * quantity
        pnl_clp = current_value_clp - cost_basis_clp

        if cost_basis_clp > 0:
            pnl_pct = round(float(pnl_clp / cost_basis_clp * 100), 2)

    return HoldingPnL(
        name=holding["name"],
        ticker=holding.get("ticker"),
        platform=holding["platform"],
        asset_class=holding.get("asset_class", "other"),
        quantity=quantity,
        current_value_clp=current_value_clp,
        cost_basis_clp=cost_basis_clp,
        pnl_clp=pnl_clp,
        pnl_pct=pnl_pct,
        currency=holding.get("currency", "USD"),
    )


def get_portfolio_performance() -> PortfolioPerformance:
    """
    Build a full portfolio performance snapshot.

    Strategy:
    1. Load persisted holdings from DB
    2. Get current prices (from DB cache, falling back to live fetch)
    3. Calculate PnL per holding
    4. Aggregate to portfolio totals
    """
    # Step 1: load holdings from DB
    db_holdings = get_all_holdings_from_db()

    if not db_holdings:
        logger.info("No holdings in DB — fetching live and syncing first")
        from app.services.portfolio_service import get_all_holdings
        from app.repositories.holdings_repo import sync_holdings_to_db
        live = get_all_holdings()
        sync_holdings_to_db(live)
        db_holdings = get_all_holdings_from_db()

    # Step 2: get current prices from DB
    tickers = [h["ticker"] for h in db_holdings if h.get("ticker")]
    db_prices = get_latest_prices_bulk(tickers)

    # Fallback: fetch live prices for any ticker missing from DB
    missing_tickers = [t for t in tickers if t not in db_prices]
    if missing_tickers:
        logger.info(f"Fetching live prices for {len(missing_tickers)} uncached tickers")
        from app.collectors.prices.yahoo import get_prices_bulk
        live_prices = get_prices_bulk(missing_tickers)
        db_prices.update(live_prices)

    # Step 3: calculate PnL per holding
    fx_rate = Decimal(str(get_usd_clp_rate()))
    holding_pnls = []

    for h in db_holdings:
        ticker = h.get("ticker")
        currency = h.get("currency", "USD")
        platform = h.get("platform", "manual")

        # Determine current price in CLP
        if ticker and ticker in db_prices:
            price = Decimal(str(db_prices[ticker]))
            if currency == "USD":
                price_clp = price * fx_rate
            else:
                price_clp = price
        elif platform == "fintual":
            # Fintual: NAV is stored as the "quantity" (total value), price = 1
            price_clp = Decimal("1")
        else:
            logger.warning(f"No price available for {h['name']} ({ticker}) — skipping PnL")
            continue

        pnl = calculate_holding_pnl(h, price_clp)
        holding_pnls.append(pnl)

    # Step 4: aggregate
    total_value = sum(p.current_value_clp for p in holding_pnls)

    calculable = [p for p in holding_pnls if p.pnl_clp is not None]
    total_pnl = sum(p.pnl_clp for p in calculable) if calculable else None
    total_cost = sum(p.cost_basis_clp for p in calculable if p.cost_basis_clp) if calculable else None
    total_pnl_pct = None
    if total_pnl is not None and total_cost and total_cost > 0:
        total_pnl_pct = round(float(total_pnl / total_cost * 100), 2)

    return PortfolioPerformance(
        total_value_clp=total_value,
        total_pnl_clp=total_pnl,
        total_pnl_pct=total_pnl_pct,
        holdings=holding_pnls,
        currency="CLP",
        last_updated=datetime.utcnow(),
    )


def get_performance_chart(days: int = 90) -> list[PerformanceDataPoint]:
    """
    Build a time series of portfolio value using historical net worth snapshots.
    This uses the existing networth_snapshots table — no extra computation needed.
    """
    from app.database import get_db
    since = (date.today() - timedelta(days=days)).isoformat()

    db = get_db()
    response = (
        db.table("networth_snapshots")
        .select("date, net_worth, fintual, racional, binance")
        .gte("date", since)
        .order("date", desc=False)
        .execute()
    )

    points = []
    prev_value = None

    for row in response.data:
        value = Decimal(str(row["net_worth"]))
        daily_change = value - prev_value if prev_value is not None else Decimal("0")
        daily_change_pct = (
            round(float(daily_change / prev_value * 100), 2)
            if prev_value and prev_value > 0
            else 0.0
        )
        points.append(PerformanceDataPoint(
            date=row["date"],
            value_clp=value,
            daily_change_clp=daily_change,
            daily_change_pct=daily_change_pct,
        ))
        prev_value = value

    return points
