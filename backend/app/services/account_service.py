from datetime import datetime
import uuid

from app.database import get_db
from app.models.schemas import AccountCreate, AccountRead, AccountUpdate


def list_accounts(user_id: str) -> list[AccountRead]:
    db = get_db()
    response = (
        db.table("accounts")
        .select("*")
        .eq("user_id", user_id)
        .order("is_active", desc=True)
        .order("name", desc=False)
        .execute()
    )
    return [_row_to_account(row) for row in response.data]


def create_account(user_id: str, body: AccountCreate) -> AccountRead:
    db = get_db()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": body.name,
        "type": body.type,
        "platform": body.platform,
        "currency": body.currency,
        "is_active": body.is_active,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.table("accounts").insert(row).execute()
    return _row_to_account(row)


def update_account(user_id: str, account_id: str, body: AccountUpdate) -> AccountRead | None:
    db = get_db()
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        existing = (
            db.table("accounts")
            .select("*")
            .eq("id", account_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return _row_to_account(existing.data[0]) if existing.data else None

    response = db.table("accounts").update(update).eq("id", account_id).eq("user_id", user_id).execute()
    if not response.data:
        return None
    return _row_to_account(response.data[0])


def delete_account(user_id: str, account_id: str) -> None:
    db = get_db()
    db.table("accounts").delete().eq("id", account_id).eq("user_id", user_id).execute()


def _row_to_account(row: dict) -> AccountRead:
    return AccountRead(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        platform=row.get("platform"),
        currency=row.get("currency", "CLP"),
        is_active=bool(row.get("is_active", True)),
        created_at=row.get("created_at", datetime.utcnow()),
    )
