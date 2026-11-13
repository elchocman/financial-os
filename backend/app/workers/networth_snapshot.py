"""
Net Worth Snapshot Worker
─────────────────────────
Replaces save_snapshot.py from the original repo.
Can be run:
  1. Via GitHub Actions cron (existing .github/workflows/daily_snapshot.yaml)
  2. Via the /portfolio/sync API endpoint
  3. Directly: python -m app.workers.networth_snapshot

The logic is identical — it's just been promoted into the service layer.
"""
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def run():
    """Entry point for the snapshot worker."""
    from app.services.networth_service import save_daily_snapshot, snapshot_exists_today

    if snapshot_exists_today():
        logger.warning("⚠ Snapshot already exists for today — skipping")
        return

    try:
        snapshot = save_daily_snapshot()
        logger.info(f"✅ Net worth snapshot saved: {int(snapshot.net_worth):,} CLP")
    except Exception as e:
        logger.error(f"❌ Snapshot failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run()
