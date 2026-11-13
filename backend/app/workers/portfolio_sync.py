"""
Portfolio Sync Worker
─────────────────────
Fetches live holdings from all platforms (Fintual, Racional, Binance)
and persists them to the `holdings` table in Supabase.

This is what makes holdings persistent — without this worker,
portfolio data only lives in memory for the duration of a request.

Run schedule: daily (same cron as net worth snapshot).

Usage:
  python -m app.workers.portfolio_sync
"""
import logging
import sys

logger = logging.getLogger(__name__)


def run() -> int:
    """
    Fetch live holdings and sync to DB.
    Returns the number of holdings successfully persisted.
    """
    from app.services.portfolio_service import get_all_holdings
    from app.repositories.holdings_repo import sync_holdings_to_db

    logger.info("Starting portfolio sync...")

    holdings = get_all_holdings()
    if not holdings:
        logger.warning("No holdings returned from collectors — nothing to sync")
        return 0

    logger.info(f"Collected {len(holdings)} holdings from all platforms")
    count = sync_holdings_to_db(holdings)

    logger.info(f"✅ Portfolio sync complete: {count} holdings persisted")
    return count


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    try:
        count = run()
        logger.info(f"Synced {count} holdings")
    except Exception as e:
        logger.error(f"❌ Portfolio sync failed: {e}")
        sys.exit(1)
