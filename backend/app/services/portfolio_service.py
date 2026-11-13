import logging
from datetime import datetime
from decimal import Decimal

from app.collectors.fintual.fintual_goals import get_fintual_holdings
from app.collectors.racional.racional_valuation import get_racional_holdings
from app.collectors.binance.binance_funding import get_binance_holdings
from app.models.schemas import (
    Holding,
    PlatformSummary,
    PortfolioSummary,
    AllocationItem,
    PortfolioAllocation,
)

logger = logging.getLogger(__name__)

# Platform display colors for charts
PLATFORM_COLORS = {
    "fintual": "#6366f1",   # indigo
    "racional": "#10b981",  # emerald
    "binance": "#f59e0b",   # amber
    "manual": "#94a3b8",    # slate
}

ASSET_CLASS_COLORS = {
    "fund": "#6366f1",
    "equity": "#3b82f6",
    "etf": "#10b981",
    "crypto": "#f59e0b",
    "cash": "#94a3b8",
}


def get_all_holdings() -> list[dict]:
    """
    Aggregate holdings from all connected platforms.
    Each collector returns a list of dicts with a unified schema:
      name, ticker, platform, asset_class, quantity,
      current_price, current_value, currency, current_value_clp
    """
    all_holdings = []
    errors = []

    # Fintual
    try:
        all_holdings.extend(get_fintual_holdings())
        logger.info("✓ Fintual holdings fetched")
    except Exception as e:
        logger.error(f"✗ Fintual failed: {e}")
        errors.append(f"fintual: {e}")

    # Racional
    try:
        all_holdings.extend(get_racional_holdings())
        logger.info("✓ Racional holdings fetched")
    except Exception as e:
        logger.error(f"✗ Racional failed: {e}")
        errors.append(f"racional: {e}")

    # Binance (all coins)
    try:
        binance = get_binance_holdings()
        all_holdings.extend(binance)
        logger.info(f"✓ Binance holdings fetched ({len(binance)} coins)")
    except Exception as e:
        logger.error(f"✗ Binance failed: {e}")
        errors.append(f"binance: {e}")

    if errors:
        logger.warning(f"Portfolio fetch completed with errors: {errors}")

    return all_holdings


def build_portfolio_summary() -> PortfolioSummary:
    """Build the full portfolio summary grouped by platform."""
    raw_holdings = get_all_holdings()

    # Group by platform
    platforms_map: dict[str, list[dict]] = {}
    for h in raw_holdings:
        platform = h["platform"]
        platforms_map.setdefault(platform, []).append(h)

    total_clp = sum(h["current_value_clp"] for h in raw_holdings)

    platform_summaries = []
    for platform, holdings in platforms_map.items():
        platform_total = sum(h["current_value_clp"] for h in holdings)
        pct = float(platform_total / total_clp * 100) if total_clp > 0 else 0.0

        typed_holdings = [
            Holding(
                name=h["name"],
                ticker=h.get("ticker"),
                platform=h["platform"],
                asset_class=h["asset_class"],
                quantity=h["quantity"],
                current_price=h.get("current_price"),
                current_value=h["current_value"],
                currency=h["currency"],
                current_value_clp=h["current_value_clp"],
            )
            for h in holdings
        ]

        platform_summaries.append(
            PlatformSummary(
                platform=platform,
                total_clp=platform_total,
                percentage=round(pct, 2),
                holdings=typed_holdings,
            )
        )

    # Sort by value descending
    platform_summaries.sort(key=lambda x: x.total_clp, reverse=True)

    return PortfolioSummary(
        total_clp=total_clp,
        platforms=platform_summaries,
        last_updated=datetime.utcnow(),
    )


def build_portfolio_allocation(holdings: list[dict] | None = None) -> PortfolioAllocation:
    """Build allocation breakdown by platform and asset class."""
    if holdings is None:
        holdings = get_all_holdings()

    total_clp = sum(h["current_value_clp"] for h in holdings)
    if total_clp == 0:
        return PortfolioAllocation(total_clp=Decimal("0"), by_platform=[], by_asset_class=[])

    # By platform
    by_platform_map: dict[str, Decimal] = {}
    for h in holdings:
        p = h["platform"]
        by_platform_map[p] = by_platform_map.get(p, Decimal("0")) + h["current_value_clp"]

    by_platform = [
        AllocationItem(
            label=p.capitalize(),
            value_clp=v,
            percentage=round(float(v / total_clp * 100), 2),
            color=PLATFORM_COLORS.get(p),
        )
        for p, v in sorted(by_platform_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # By asset class
    by_class_map: dict[str, Decimal] = {}
    for h in holdings:
        c = h["asset_class"]
        by_class_map[c] = by_class_map.get(c, Decimal("0")) + h["current_value_clp"]

    by_asset_class = [
        AllocationItem(
            label=c.capitalize(),
            value_clp=v,
            percentage=round(float(v / total_clp * 100), 2),
            color=ASSET_CLASS_COLORS.get(c),
        )
        for c, v in sorted(by_class_map.items(), key=lambda x: x[1], reverse=True)
    ]

    return PortfolioAllocation(
        total_clp=total_clp,
        by_platform=by_platform,
        by_asset_class=by_asset_class,
    )
