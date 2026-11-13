import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def get_racional_holdings_config() -> list[dict]:
    """
    Return Racional holdings from DB (platform='racional').
    Falls back to env vars if DB is empty or unreachable.
    """
    try:
        from app.database import get_db
        db = get_db()
        rows = db.table("holdings").select("*").eq("platform", "racional").execute().data
        if rows:
            return [
                {
                    "name": r["name"],
                    "ticker": r["ticker"],
                    "shares": float(r["quantity"]),
                    "currency": r.get("currency", "USD"),
                }
                for r in rows
                if float(r["quantity"]) > 0
            ]
        logger.info("No Racional holdings in DB — using env var fallback")
    except Exception as e:
        logger.warning(f"DB read for Racional failed, using env fallback: {e}")

    return _get_from_env()


def _get_from_env() -> list[dict]:
    s = get_settings()
    return [
        {"name": "LATAM Airlines",   "ticker": "LTM.SN",      "shares": s.racional_ltm_shares,      "currency": "CLP"},
        {"name": "ETF S&P500 Chile", "ticker": "CFISP500.SN", "shares": s.racional_cfisp500_shares, "currency": "CLP"},
        {"name": "Meta Platforms",   "ticker": "META",         "shares": s.racional_meta_shares,     "currency": "USD"},
        {"name": "Amazon",           "ticker": "AMZN",         "shares": s.racional_amzn_shares,     "currency": "USD"},
        {"name": "Microsoft",        "ticker": "MSFT",         "shares": s.racional_msft_shares,     "currency": "USD"},
    ]
