import hashlib
import hmac
import logging
import time

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)
BINANCE_BASE_URL = "https://api.binance.com"


def get_binance_account_balances() -> list[dict]:
    """
    Fetch non-zero account balances from Binance REST API.
    Returns list of {"asset": str, "free": float, "locked": float, "total": float}.
    Raises ValueError if API keys not configured.
    """
    settings = get_settings()
    api_key = settings.binance_api_key
    api_secret = settings.binance_api_secret

    if not api_key or not api_secret:
        raise ValueError("BINANCE_API_KEY / BINANCE_API_SECRET not configured")

    timestamp = int(time.time() * 1000)
    query_string = f"timestamp={timestamp}"
    signature = hmac.new(api_secret.encode(), query_string.encode(), hashlib.sha256).hexdigest()

    response = requests.get(
        f"{BINANCE_BASE_URL}/api/v3/account",
        params={"timestamp": timestamp, "signature": signature},
        headers={"X-MBX-APIKEY": api_key},
        timeout=10,
    )
    response.raise_for_status()

    data = response.json()
    if "code" in data:
        raise ValueError(f"Binance API error {data['code']}: {data.get('msg', '')}")

    balances = []
    for b in data.get("balances", []):
        free = float(b["free"])
        locked = float(b["locked"])
        total = free + locked
        if total > 0.0000001:
            balances.append({"asset": b["asset"], "free": free, "locked": locked, "total": total})

    return balances


def get_binance_prices() -> dict[str, float]:
    """
    Fetch all coin prices in USDT from Binance public ticker endpoint.
    No authentication required. Returns {asset: price_in_usd}.
    """
    response = requests.get(
        f"{BINANCE_BASE_URL}/api/v3/ticker/price",
        timeout=10,
    )
    response.raise_for_status()
    prices: dict[str, float] = {}
    for item in response.json():
        symbol: str = item["symbol"]
        if symbol.endswith("USDT"):
            coin = symbol[:-4]
            prices[coin] = float(item["price"])
    return prices
