"""
Daily Runner
────────────
Orchestrates all background workers in the correct dependency order:

  1. fx_updater        → persist today's USD/CLP rate first
  2. price_updater     → persist current market prices
  3. portfolio_sync    → persist holdings snapshot to DB
  4. networth_snapshot → calculate and store net worth using above data

This replaces the original save_snapshot.py and adds persistence
of prices and holdings alongside the net worth snapshot.

Usage:
  python -m app.workers.daily_runner

GitHub Actions: update daily_snapshot.yaml to call this instead of
  python -m app.workers.networth_snapshot
"""
import logging
import sys
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)


def run():
    start = datetime.utcnow()
    logger.info("═" * 60)
    logger.info("  Financial OS — Daily Runner")
    logger.info(f"  Started at {start.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    logger.info("═" * 60)

    results = {
        "fx_updated": False,
        "prices_updated": 0,
        "holdings_synced": 0,
        "snapshot_saved": False,
        "errors": [],
    }

    # ── Step 1: FX rates ──────────────────────────────────────────
    logger.info("\n[1/4] Updating FX rates...")
    try:
        from app.workers.fx_updater import run as run_fx
        rates = run_fx()
        results["fx_updated"] = len(rates) > 0
    except Exception as e:
        msg = f"FX updater failed: {e}"
        logger.error(f"  ✗ {msg}")
        results["errors"].append(msg)
        # Non-fatal: continue with cached rate

    # ── Step 2: Price updates ─────────────────────────────────────
    logger.info("\n[2/4] Updating prices...")
    try:
        from app.workers.price_updater import run as run_prices
        prices = run_prices()
        results["prices_updated"] = len(prices)
    except Exception as e:
        msg = f"Price updater failed: {e}"
        logger.error(f"  ✗ {msg}")
        results["errors"].append(msg)
        # Non-fatal: portfolio sync can still use live prices

    # ── Step 3: Portfolio sync ────────────────────────────────────
    logger.info("\n[3/4] Syncing holdings to DB...")
    try:
        from app.workers.portfolio_sync import run as run_sync
        count = run_sync()
        results["holdings_synced"] = count
    except Exception as e:
        msg = f"Portfolio sync failed: {e}"
        logger.error(f"  ✗ {msg}")
        results["errors"].append(msg)

    # ── Step 4: Net worth snapshot ────────────────────────────────
    logger.info("\n[4/5] Saving net worth snapshot...")
    try:
        from app.workers.networth_snapshot import run as run_snapshot
        run_snapshot()
        results["snapshot_saved"] = True
    except Exception as e:
        msg = f"Snapshot failed: {e}"
        logger.error(f"  ✗ {msg}")
        results["errors"].append(msg)

    # ── Step 5: Goals auto-progress ───────────────────────────────
    logger.info("\n[5/5] Syncing goal progress...")
    goals_updated = 0
    try:
        from app.workers.goals_sync import run as run_goals
        goals_updated = run_goals()
    except Exception as e:
        msg = f"Goals sync failed: {e}"
        logger.error(f"  ✗ {msg}")
        results["errors"].append(msg)

    # ── Summary ───────────────────────────────────────────────────
    elapsed = (datetime.utcnow() - start).total_seconds()
    logger.info("\n" + "═" * 60)
    logger.info("  Summary")
    logger.info("─" * 60)
    logger.info(f"  FX updated:       {'✓' if results['fx_updated'] else '✗'}")
    logger.info(f"  Prices saved:     {results['prices_updated']} tickers")
    logger.info(f"  Holdings synced:  {results['holdings_synced']}")
    logger.info(f"  Snapshot saved:   {'✓' if results['snapshot_saved'] else '✗'}")
    logger.info(f"  Goals updated:    {goals_updated}")
    logger.info(f"  Errors:           {len(results['errors'])}")
    logger.info(f"  Elapsed:          {elapsed:.1f}s")
    logger.info("═" * 60)

    if results["errors"]:
        for err in results["errors"]:
            logger.warning(f"  ⚠ {err}")

    # Exit with error code only if the critical step (snapshot) failed
    if not results["snapshot_saved"]:
        logger.error("Critical step (snapshot) failed — exiting with error")
        sys.exit(1)


if __name__ == "__main__":
    run()
