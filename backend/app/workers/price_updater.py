"""
Price Updater Worker
────────────────────
Fetches current market prices for all tracked tickers and
persists them to the `prices` table.

Tickers tracked:
  - All Racional holdings (equities + ETFs)
  - BTC-USD (Binance)
  - USDCLP=X (FX rate — also calls fx_updater)

Run schedule: every 15 minutes during market hours (via GitHub Actions or APScheduler).
For MVP: run daily alongside the net worth snapshot.

Usage:
  python -m app.workers.price_updater
"""
import logging
import sys

logger = logging.getLogger(__name__)


def _get_all_tickers() -> list[tuple[str, str]]:
    """
    Return all tickers to track as (ticker, currency) pairs.
    In V2 this will read from the `holdings` table in DB.
    For now, derives from config (same source as collectors).
    """
    from app.collectors.racional.racional_holdings import get_racional_holdings_config

    tickers = []

    # Racional equities / ETFs
    for h in get_racional_holdings_config():
        if h["shares"] > 0:
            tickers.append((h["ticker"], h["currency"]))

    # BTC from Binance
    from app.config import get_settings
    if get_settings().binance_btc_amount > 0:
        tickers.append(("BTC-USD", "USD"))

    return tickers


def run() -> dict[str, float]:
    """
    Fetch and persist current prices for all tracked tickers.
    Returns dict of {ticker: price} for logging/monitoring.
    """
    from app.collectors.prices.yahoo import get_prices_bulk
    from app.repositories.holdings_repo import save_price

    tickers_with_currency = _get_all_tickers()
    if not tickers_with_currency:
        logger.warning("No tickers configured — nothing to update")
        return {}

    ticker_list = [t for t, _ in tickers_with_currency]
    currency_map = {t: c for t, c in tickers_with_currency}

    logger.info(f"Fetching prices for: {ticker_list}")
    prices = get_prices_bulk(ticker_list)

    saved = 0
    for ticker, price in prices.items():
        try:
            currency = currency_map.get(ticker, "USD")
            save_price(ticker, price, currency, source="yahoo")
            saved += 1
            logger.info(f"  {ticker}: {price} {currency}")
        except Exception as e:
            logger.error(f"  Failed to save price for {ticker}: {e}")

    logger.info(f"✅ Price update complete: {saved}/{len(ticker_list)} tickers saved")
    return prices


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    try:
        run()
    except Exception as e:
        logger.error(f"❌ Price updater failed: {e}")
        sys.exit(1)
