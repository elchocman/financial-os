import logging
from datetime import datetime, timedelta
from decimal import Decimal

import requests as _requests
import yfinance as yf

from app.utils.numbers import truncate

logger = logging.getLogger(__name__)

# Simple in-memory cache: (rate, fetched_at)
_fx_cache: dict[str, tuple[float, datetime]] = {}
CACHE_TTL_MINUTES = 60


def get_usd_clp_rate() -> float:
    """
    Fetch USD→CLP exchange rate via Yahoo Finance.
    Cached in memory for 60 minutes to avoid hammering the API.
    """
    cache_key = "USD_CLP"
    now = datetime.utcnow()

    if cache_key in _fx_cache:
        rate, fetched_at = _fx_cache[cache_key]
        age_minutes = (now - fetched_at).total_seconds() / 60
        if age_minutes < CACHE_TTL_MINUTES:
            logger.debug(f"FX cache hit: 1 USD = {rate} CLP")
            return rate

    # Source 1: Yahoo Finance
    logger.info("Fetching USD/CLP rate from Yahoo Finance...")
    for ticker_sym in ("USDCLP=X", "CLP=X"):
        try:
            t = yf.Ticker(ticker_sym)
            hist = t.history(period="5d")
            if not hist.empty:
                rate = float(hist["Close"].dropna().iloc[-1])
                _fx_cache[cache_key] = (rate, now)
                logger.info(f"USD/CLP rate from Yahoo ({ticker_sym}): {rate}")
                return rate
            price = t.fast_info.get("last_price")
            if price:
                rate = float(price)
                _fx_cache[cache_key] = (rate, now)
                logger.info(f"USD/CLP rate from Yahoo fast_info ({ticker_sym}): {rate}")
                return rate
        except Exception as e:
            logger.debug(f"Yahoo Finance {ticker_sym} failed: {e}")

    # Source 2: exchangerate-api.com (free, no key required)
    try:
        resp = _requests.get(
            "https://api.exchangerate-api.com/v4/latest/USD",
            timeout=5,
        )
        resp.raise_for_status()
        clp = resp.json()["rates"].get("CLP")
        if clp:
            rate = float(clp)
            _fx_cache[cache_key] = (rate, now)
            logger.info(f"USD/CLP rate from exchangerate-api: {rate}")
            return rate
    except Exception as e:
        logger.warning(f"exchangerate-api failed: {e}")

    # Source 3: env override
    from os import getenv
    fallback = getenv("USD_CLP_FALLBACK")
    if fallback:
        try:
            rate = float(fallback)
            logger.warning(f"Using USD_CLP_FALLBACK={rate}")
            _fx_cache[cache_key] = (rate, now)
            return rate
        except ValueError:
            pass

    default_rate = 950.0
    logger.warning(f"All FX sources failed — using default {default_rate}")
    _fx_cache[cache_key] = (default_rate, now)
    return default_rate


def usd_to_clp(amount_usd: float) -> int:
    """Convert a USD amount to CLP (integer, truncated)."""
    rate = get_usd_clp_rate()
    total = amount_usd * rate
    return int(truncate(total, 0))


def usd_to_clp_decimal(amount_usd: float) -> Decimal:
    """Convert USD to CLP, returned as Decimal."""
    return Decimal(str(usd_to_clp(amount_usd)))


def invalidate_fx_cache() -> None:
    """Force-clear FX cache (called by fx_updater worker)."""
    _fx_cache.clear()
    logger.info("FX cache invalidated")
