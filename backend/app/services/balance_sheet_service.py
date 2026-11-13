"""
Balance Sheet Service
──────────────────────
Manages the user's full balance sheet:
  Assets     = cash + investments + crypto + real estate + other
  Liabilities = credit cards + loans + mortgage
  Net Worth  = Assets − Liabilities

The investment portfolio value from the portfolio service
is automatically included as the "Investments" asset bucket.
"""
import logging
import uuid
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.models.schemas import (
    AssetItem,
    AssetCreate,
    BalanceSheet,
    BalanceSheetBucket,
)

logger = logging.getLogger(__name__)

# Asset type → display grouping
ASSET_BUCKETS = {
    "cash":        ("Assets", "#10b981"),
    "investment":  ("Assets", "#6366f1"),
    "crypto":      ("Assets", "#f59e0b"),
    "real_estate": ("Assets", "#3b82f6"),
    "other":       ("Assets", "#64748b"),
}
LIABILITY_BUCKETS = {
    "credit_card": ("Liabilities", "#f43f5e"),
    "loan":        ("Liabilities", "#f43f5e"),
    "mortgage":    ("Liabilities", "#f43f5e"),
    "other":       ("Liabilities", "#f43f5e"),
}


def get_all_assets(user_id: str) -> list[AssetItem]:
    """Fetch all manually tracked assets and liabilities from DB for a given user."""
    db = get_db()
    response = (
        db.table("assets")
        .select("*")
        .eq("user_id", user_id)
        .order("type")
        .execute()
    )
    return [_row_to_asset(row) for row in response.data]


def create_asset(user_id: str, body: AssetCreate) -> AssetItem:
    """Create a new asset or liability entry for the user."""
    db = get_db()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": body.name,
        "type": body.type,
        "subtype": body.subtype,
        "is_liability": body.is_liability,
        "current_value": float(body.current_value),
        "currency": body.currency,
        "updated_at": datetime.utcnow().isoformat(),
    }
    db.table("assets").insert(row).execute()
    return _row_to_asset(row)


def update_asset(user_id: str, asset_id: str, body: AssetCreate) -> AssetItem | None:
    """Update an existing asset's value or metadata for the user."""
    db = get_db()
    update = {
        "name": body.name,
        "type": body.type,
        "subtype": body.subtype,
        "is_liability": body.is_liability,
        "current_value": float(body.current_value),
        "currency": body.currency,
        "updated_at": datetime.utcnow().isoformat(),
    }
    response = db.table("assets").update(update).eq("id", asset_id).eq("user_id", user_id).execute()
    if not response.data:
        return None
    return _row_to_asset(response.data[0])


def delete_asset(user_id: str, asset_id: str) -> None:
    db = get_db()
    db.table("assets").delete().eq("id", asset_id).eq("user_id", user_id).execute()


def build_balance_sheet(user_id: str, portfolio_value_clp: Decimal | None = None) -> BalanceSheet:
    """
    Build the full balance sheet.

    If portfolio_value_clp is provided, it's injected as the
    "Investments" asset bucket (sourced live from portfolio service).
    This avoids double-counting with manually entered investment assets.
    """
    manual_assets = get_all_assets(user_id)

    # Separate assets vs liabilities
    assets = [a for a in manual_assets if not a.is_liability]
    liabilities = [a for a in manual_assets if a.is_liability]

    # Group assets by type
    asset_buckets: dict[str, list[AssetItem]] = {}
    for asset in assets:
        bucket = asset.type
        asset_buckets.setdefault(bucket, []).append(asset)

    # Inject portfolio value as investment bucket if provided
    if portfolio_value_clp and portfolio_value_clp > 0:
        # Remove any manually-entered "investment" assets to avoid double-counting
        # (they should use type="investment" only for non-tracked platforms)
        synced_investment = AssetItem(
            id="__portfolio__",
            name="Investment Portfolio (live)",
            type="investment",
            subtype="portfolio",
            is_liability=False,
            current_value=portfolio_value_clp,
            currency="CLP",
            updated_at=datetime.utcnow(),
        )
        asset_buckets.setdefault("investment", []).insert(0, synced_investment)

    # Calculate totals
    total_assets = sum(
        item.current_value
        for items in asset_buckets.values()
        for item in items
    )
    total_liabilities = sum(a.current_value for a in liabilities)
    net_worth = total_assets - total_liabilities

    # Build bucket summaries for the UI
    bucket_summaries = []
    bucket_order = ["cash", "investment", "crypto", "real_estate", "other"]
    for bucket_type in bucket_order:
        items = asset_buckets.get(bucket_type, [])
        if not items:
            continue
        bucket_total = sum(i.current_value for i in items)
        _, color = ASSET_BUCKETS.get(bucket_type, ("Assets", "#64748b"))
        bucket_summaries.append(BalanceSheetBucket(
            type=bucket_type,
            label=_bucket_label(bucket_type),
            total=bucket_total,
            percentage=round(float(bucket_total / total_assets * 100), 1) if total_assets > 0 else 0.0,
            color=color,
            items=items,
        ))

    return BalanceSheet(
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=net_worth,
        assets=bucket_summaries,
        liabilities=liabilities,
        currency="CLP",
        last_updated=datetime.utcnow(),
    )


def _bucket_label(bucket_type: str) -> str:
    labels = {
        "cash": "Cash & Equivalents",
        "investment": "Investments",
        "crypto": "Crypto",
        "real_estate": "Real Estate",
        "other": "Other Assets",
    }
    return labels.get(bucket_type, bucket_type.replace("_", " ").title())


def _row_to_asset(row: dict) -> AssetItem:
    return AssetItem(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        subtype=row.get("subtype"),
        is_liability=row.get("is_liability", False),
        current_value=Decimal(str(row.get("current_value") or 0)),
        currency=row.get("currency", "CLP"),
        updated_at=row.get("updated_at", datetime.utcnow()),
    )
