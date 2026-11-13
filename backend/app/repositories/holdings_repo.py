"""
Database Repository Layer
─────────────────────────
All direct Supabase queries live here.
Services call repositories — never query the DB directly.
This makes testing and potential DB migrations much cleaner.
"""
import logging
import uuid
from datetime import date, datetime
from decimal import Decimal

from app.database import get_db

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
# HOLDINGS REPOSITORY
# ══════════════════════════════════════════════════════════════

def upsert_holding(holding: dict) -> dict:
    """
    Insert or update a holding by (platform, ticker/name).
    Uses platform + ticker as the natural key.
    For funds without a ticker (Fintual), uses platform + name.
    """
    db = get_db()
    now = datetime.utcnow().isoformat()

    # Build the natural key for matching
    ticker = holding.get("ticker")
    platform = holding["platform"]
    name = holding["name"]

    # Check if this holding already exists
    query = db.table("holdings").select("id")
    if ticker:
        query = query.eq("platform", platform).eq("ticker", ticker)
    else:
        query = query.eq("platform", platform).eq("name", name)

    existing = query.execute()

    row = {
        "name": name,
        "ticker": ticker,
        "platform": platform,
        "asset_class": holding.get("asset_class", "other"),
        "quantity": float(holding["quantity"]),
        "avg_cost": float(holding.get("avg_cost", 0)) if holding.get("avg_cost") else None,
        "currency": holding.get("currency", "USD"),
        "updated_at": now,
    }

    if existing.data:
        holding_id = existing.data[0]["id"]
        db.table("holdings").update(row).eq("id", holding_id).execute()
        row["id"] = holding_id
        logger.debug(f"Updated holding: {platform}/{name}")
    else:
        holding_id = str(uuid.uuid4())
        row["id"] = holding_id
        db.table("holdings").insert(row).execute()
        logger.debug(f"Inserted holding: {platform}/{name}")

    return row


def get_all_holdings_from_db() -> list[dict]:
    """Fetch all persisted holdings from DB."""
    db = get_db()
    response = (
        db.table("holdings")
        .select("*")
        .order("platform")
        .execute()
    )
    return response.data


def get_holdings_by_platform(platform: str) -> list[dict]:
    db = get_db()
    return db.table("holdings").select("*").eq("platform", platform).execute().data


def get_manual_holdings(platform: str, user_id: str | None = None) -> list[dict]:
    """Fetch manual holdings for a platform, optionally scoped to a user."""
    db = get_db()
    query = db.table("holdings").select("*").eq("platform", platform)
    if user_id:
        query = query.eq("user_id", user_id)
    return query.order("name").execute().data


def create_manual_holding(user_id: str, holding: dict) -> dict:
    """Insert a new manual holding. Returns the created row."""
    db = get_db()
    now = datetime.utcnow().isoformat()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": holding["name"],
        "ticker": holding.get("ticker"),
        "platform": holding.get("platform", "racional"),
        "asset_class": holding.get("asset_class", "equity"),
        "quantity": float(holding["quantity"]),
        "avg_cost": float(holding["avg_cost"]) if holding.get("avg_cost") else None,
        "currency": holding.get("currency", "USD"),
        "updated_at": now,
    }
    db.table("holdings").insert(row).execute()
    return row


def update_manual_holding(user_id: str, holding_id: str, fields: dict) -> dict | None:
    """Update an existing manual holding. Returns updated row or None if not found."""
    db = get_db()
    existing = (
        db.table("holdings").select("*")
        .eq("id", holding_id).eq("user_id", user_id).execute()
    )
    if not existing.data:
        return None

    current = existing.data[0]
    update = {k: v for k, v in {
        "name": fields.get("name", current["name"]),
        "ticker": fields.get("ticker", current["ticker"]),
        "asset_class": fields.get("asset_class", current["asset_class"]),
        "quantity": float(fields["quantity"]) if "quantity" in fields else float(current["quantity"]),
        "avg_cost": float(fields["avg_cost"]) if fields.get("avg_cost") is not None else current.get("avg_cost"),
        "currency": fields.get("currency", current["currency"]),
        "updated_at": datetime.utcnow().isoformat(),
    }.items() if v is not None or k in ("avg_cost",)}
    db.table("holdings").update(update).eq("id", holding_id).execute()
    return {**current, **update}


def delete_manual_holding(user_id: str, holding_id: str) -> bool:
    """Delete a manual holding. Returns True if deleted, False if not found."""
    db = get_db()
    existing = db.table("holdings").select("id").eq("id", holding_id).eq("user_id", user_id).execute()
    if not existing.data:
        return False
    db.table("holdings").delete().eq("id", holding_id).execute()
    return True


def sync_holdings_to_db(holdings: list[dict]) -> int:
    """
    Persist a full list of live holdings to the DB.
    Returns the number of holdings upserted.
    """
    count = 0
    for h in holdings:
        try:
            upsert_holding(h)
            count += 1
        except Exception as e:
            logger.error(f"Failed to upsert holding {h.get('name')}: {e}")
    logger.info(f"✓ Synced {count}/{len(holdings)} holdings to DB")
    return count


# ══════════════════════════════════════════════════════════════
# PRICES REPOSITORY
# ══════════════════════════════════════════════════════════════

def save_price(ticker: str, price: float, currency: str, source: str = "yahoo") -> None:
    """
    Save a price snapshot. Upserts on (ticker, date) to avoid duplicates.
    """
    db = get_db()
    today = date.today().isoformat()

    # Check if price exists for today
    existing = (
        db.table("prices")
        .select("id")
        .eq("ticker", ticker)
        .gte("fetched_at", f"{today}T00:00:00")
        .lte("fetched_at", f"{today}T23:59:59")
        .execute()
    )

    row = {
        "ticker": ticker,
        "price": price,
        "currency": currency,
        "source": source,
        "fetched_at": datetime.utcnow().isoformat(),
    }

    if existing.data:
        db.table("prices").update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        row["id"] = str(uuid.uuid4())
        db.table("prices").insert(row).execute()


def get_latest_price(ticker: str) -> dict | None:
    """Get the most recent price record for a ticker."""
    db = get_db()
    response = (
        db.table("prices")
        .select("*")
        .eq("ticker", ticker)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def get_price_history(ticker: str, days: int = 90) -> list[dict]:
    """Get price history for a ticker over the last N days."""
    db = get_db()
    from datetime import timedelta
    since = (date.today() - timedelta(days=days)).isoformat()
    response = (
        db.table("prices")
        .select("ticker, price, currency, fetched_at")
        .eq("ticker", ticker)
        .gte("fetched_at", since)
        .order("fetched_at", desc=False)
        .execute()
    )
    return response.data


def get_latest_prices_bulk(tickers: list[str]) -> dict[str, float]:
    """
    Fetch the latest stored price for each ticker.
    Returns {ticker: price}. Missing tickers are omitted.
    """
    if not tickers:
        return {}

    db = get_db()
    result = {}

    # Fetch latest price per ticker using a subquery approach
    # (Supabase doesn't support window functions directly, so we query per ticker)
    for ticker in tickers:
        row = get_latest_price(ticker)
        if row:
            result[ticker] = float(row["price"])

    return result


# ══════════════════════════════════════════════════════════════
# FX RATES REPOSITORY
# ══════════════════════════════════════════════════════════════

def save_fx_rate(from_currency: str, to_currency: str, rate: float) -> None:
    """Persist today's FX rate. Upserts on (pair, date)."""
    db = get_db()
    today = date.today().isoformat()

    existing = (
        db.table("fx_rates")
        .select("id")
        .eq("from_currency", from_currency)
        .eq("to_currency", to_currency)
        .gte("fetched_at", f"{today}T00:00:00")
        .execute()
    )

    row = {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "rate": rate,
        "fetched_at": datetime.utcnow().isoformat(),
    }

    if existing.data:
        db.table("fx_rates").update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        row["id"] = str(uuid.uuid4())
        db.table("fx_rates").insert(row).execute()

    logger.debug(f"Saved FX rate: 1 {from_currency} = {rate} {to_currency}")


def get_latest_fx_rate(from_currency: str, to_currency: str) -> float | None:
    """Get the most recently stored FX rate for a currency pair."""
    db = get_db()
    response = (
        db.table("fx_rates")
        .select("rate")
        .eq("from_currency", from_currency)
        .eq("to_currency", to_currency)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return float(response.data[0]["rate"])
    return None


def get_fx_rate_history(from_currency: str, to_currency: str, days: int = 30) -> list[dict]:
    """Get historical FX rates for a currency pair."""
    db = get_db()
    from datetime import timedelta
    since = (date.today() - timedelta(days=days)).isoformat()
    response = (
        db.table("fx_rates")
        .select("rate, fetched_at")
        .eq("from_currency", from_currency)
        .eq("to_currency", to_currency)
        .gte("fetched_at", since)
        .order("fetched_at", desc=False)
        .execute()
    )
    return response.data
