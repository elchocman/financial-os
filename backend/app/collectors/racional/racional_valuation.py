import logging
from decimal import Decimal

import yfinance as yf

from app.collectors.racional.racional_holdings import get_racional_holdings_config
from app.utils.fx import usd_to_clp_decimal
from app.utils.numbers import to_decimal

logger = logging.getLogger(__name__)


def get_price_clp(ticker: str, currency: str) -> tuple[float, Decimal]:
    """
    Fetch current price for a ticker. Returns (price_in_native, value_clp_per_share).
    """
    stock = yf.Ticker(ticker)
    price = None

    # fast_info is fastest but sometimes returns None when Yahoo blocks
    try:
        price = stock.fast_info.get("last_price")
    except Exception:
        pass

    # Fall back to 5-day history (more lenient than 1d, handles weekends/holidays)
    if not price:
        try:
            hist = stock.history(period="5d")
            if not hist.empty:
                price = float(hist["Close"].dropna().iloc[-1])
        except Exception:
            pass

    if not price:
        raise ValueError(f"Could not fetch price for {ticker}")

    price = float(price)

    if currency == "USD":
        price_clp = usd_to_clp_decimal(price)
    else:
        price_clp = to_decimal(price, 2)

    return price, price_clp


def get_racional_holdings() -> list[dict]:
    """
    Returns a structured list of Racional holdings with current valuations.
    Each item includes current_value_clp for unified portfolio aggregation.
    """
    config = get_racional_holdings_config()
    holdings = []

    for item in config:
        shares = item["shares"]
        if shares <= 0:
            logger.debug(f"Skipping {item['name']} — 0 shares configured")
            continue

        ticker = item["ticker"]
        currency = item["currency"]

        try:
            price, price_clp = get_price_clp(ticker, currency)
            value_clp = price_clp * Decimal(str(shares))

            holdings.append({
                "name": item["name"],
                "ticker": ticker,
                "platform": "racional",
                "asset_class": _classify_ticker(ticker),
                "quantity": Decimal(str(shares)),
                "current_price": to_decimal(price, 4),
                "current_value": to_decimal(price * shares, 2),
                "currency": currency,
                "current_value_clp": value_clp,
            })

        except Exception as e:
            logger.error(f"Failed to price {ticker}: {e}")
            # Don't fail the whole portfolio — skip this holding
            continue

    return holdings


def get_racional_total() -> int:
    """Return total Racional portfolio value in CLP."""
    holdings = get_racional_holdings()
    total = sum(h["current_value_clp"] for h in holdings)
    return int(total)


def _classify_ticker(ticker: str) -> str:
    """Infer asset class from ticker symbol."""
    etf_patterns = ["SP500", "ETF", "CFI"]
    if any(p in ticker.upper() for p in etf_patterns):
        return "etf"
    if ticker.endswith(".SN"):
        return "equity"
    return "equity"
