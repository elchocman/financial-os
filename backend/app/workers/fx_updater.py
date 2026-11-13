"""
FX Rate Updater Worker
──────────────────────
Fetches the current USD/CLP exchange rate from Yahoo Finance
and persists it to the `fx_rates` table.

Also invalidates the in-memory FX cache in utils/fx.py so
the next request gets a fresh rate.

Run schedule: every hour (GitHub Actions or APScheduler).

Usage:
  python -m app.workers.fx_updater
"""
import logging
import sys

logger = logging.getLogger(__name__)

# Currency pairs to track — extend here for multi-currency support
PAIRS_TO_TRACK = [
    ("USD", "CLP"),   # Primary: US Dollar to Chilean Peso
    # ("EUR", "CLP"), # Add more pairs here as needed
    # ("USD", "UF"),  # UF support in future
]


def run() -> dict[str, float]:
    """
    Fetch and persist all configured FX rates.
    Returns dict of {"USD_CLP": rate, ...}.
    """
    import yfinance as yf
    from app.repositories.holdings_repo import save_fx_rate
    from app.utils.fx import invalidate_fx_cache

    results = {}

    for from_currency, to_currency in PAIRS_TO_TRACK:
        try:
            rate = _fetch_rate(from_currency, to_currency)
            save_fx_rate(from_currency, to_currency, rate)
            results[f"{from_currency}_{to_currency}"] = rate
            logger.info(f"✓ 1 {from_currency} = {rate:,.2f} {to_currency}")
        except Exception as e:
            logger.error(f"✗ Failed to fetch {from_currency}/{to_currency}: {e}")

    # Invalidate in-memory cache so the next portfolio fetch uses fresh rate
    invalidate_fx_cache()

    if results:
        logger.info(f"✅ FX update complete: {len(results)} pair(s) saved")
    else:
        logger.warning("⚠ No FX rates were saved")

    return results


def _fetch_rate(from_currency: str, to_currency: str) -> float:
    """Fetch exchange rate from Yahoo Finance."""
    import yfinance as yf

    # Yahoo Finance FX ticker format: USDCLP=X
    ticker_symbol = f"{from_currency}{to_currency}=X"
    ticker = yf.Ticker(ticker_symbol)

    # Try fast_info first
    price = ticker.fast_info.get("last_price")
    if price is not None:
        return float(price)

    # Fallback to history
    hist = ticker.history(period="1d")
    if not hist.empty:
        return float(hist["Close"].iloc[-1])

    raise ValueError(f"Could not fetch rate for {ticker_symbol}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    try:
        run()
    except Exception as e:
        logger.error(f"❌ FX updater failed: {e}")
        sys.exit(1)
