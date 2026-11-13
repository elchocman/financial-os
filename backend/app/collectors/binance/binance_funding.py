import logging
from decimal import Decimal

import yfinance as yf

from app.config import get_settings
from app.utils.fx import usd_to_clp_decimal
from app.utils.numbers import to_decimal

logger = logging.getLogger(__name__)

STABLECOINS = {"USDT", "USDC", "BUSD", "FDUSD", "DAI", "TUSD", "USDP", "UST"}
MIN_USD_VALUE = 1.0  # skip dust below $1


def _get_btc_price_usd_fallback() -> float:
    """Yahoo Finance BTC price — only used when API keys are not set."""
    try:
        btc = yf.Ticker("BTC-USD")
        hist = btc.history(period="1d")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
        price = btc.fast_info.get("last_price")
        if price:
            return float(price)
    except Exception as e:
        logger.warning(f"Yahoo BTC price failed: {e}")
    return 95000.0  # last-resort fallback


def get_binance_holdings() -> list[dict]:
    """
    Returns all Binance holdings with value > $1 USD.
    - With API keys: fetches real account balances + Binance price feed.
    - Without API keys: falls back to BINANCE_BTC_AMOUNT env var.
    """
    settings = get_settings()

    if settings.binance_api_key and settings.binance_api_secret:
        try:
            return _holdings_from_api()
        except Exception as e:
            logger.warning(f"Binance API failed, using manual fallback: {e}")

    # Manual fallback — single BTC holding from env var
    if settings.binance_btc_amount > 0:
        btc_price = _get_btc_price_usd_fallback()
        return [_build_holding("BTC", settings.binance_btc_amount, btc_price)]

    return []


def _holdings_from_api() -> list[dict]:
    from app.collectors.binance.binance_api import get_binance_account_balances, get_binance_prices

    balances = get_binance_account_balances()
    prices = get_binance_prices()

    holdings = []
    for b in balances:
        asset = b["asset"]
        amount = b["total"]

        if asset in STABLECOINS:
            price_usd = 1.0
        elif asset in prices:
            price_usd = prices[asset]
        else:
            logger.debug(f"No price for {asset} — skipping")
            continue

        value_usd = amount * price_usd
        if value_usd < MIN_USD_VALUE:
            continue

        holdings.append(_build_holding(asset, amount, price_usd))

    holdings.sort(key=lambda h: float(h["current_value_clp"]), reverse=True)
    logger.info(f"Binance API: {len(holdings)} holdings fetched")
    return holdings


def _build_holding(asset: str, amount: float, price_usd: float) -> dict:
    value_usd = amount * price_usd
    value_clp = usd_to_clp_decimal(value_usd)
    asset_class = "cash" if asset in STABLECOINS else "crypto"
    ticker = asset if asset in STABLECOINS else f"{asset}-USD"

    return {
        "name": asset,
        "ticker": ticker,
        "platform": "binance",
        "asset_class": asset_class,
        "quantity": Decimal(str(amount)),
        "current_price": to_decimal(price_usd, 6 if price_usd < 0.01 else 2),
        "current_value": to_decimal(value_usd, 2),
        "currency": "USD",
        "current_value_clp": value_clp,
    }


def get_binance_total_clp() -> int:
    """Return total Binance portfolio value in CLP. Used by snapshot worker."""
    return sum(int(h["current_value_clp"]) for h in get_binance_holdings())


# Backwards-compat alias used by older code paths
def get_bitcoin_total_clp() -> int:
    return get_binance_total_clp()
