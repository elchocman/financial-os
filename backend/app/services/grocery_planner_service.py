from datetime import date, datetime
from decimal import Decimal
from html import unescape
from html.parser import HTMLParser
import json
import re
import uuid

import requests

from app.database import get_db
from app.models.schemas import GroceryItem, GroceryItemInput, GroceryPlan, GroceryPlanUpdate, GrocerySearchResult

DEFAULT_GROCERY_TIMEOUT = 12
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
}


class _AnchorCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.anchors: list[dict[str, str | None]] = []
        self._href: str | None = None
        self._chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._chunks = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or self._href is None:
            return
        text = _normalize_whitespace(unescape(" ".join(self._chunks)))
        if text:
            self.anchors.append({"href": self._href, "text": text})
        self._href = None
        self._chunks = []


def get_grocery_plan(user_id: str, month: str | None = None) -> GroceryPlan:
    month_date = _parse_month(month)
    month_key = month_date.strftime("%Y-%m")
    db = get_db()

    plan_resp = (
        db.table("grocery_plans")
        .select("*")
        .eq("user_id", user_id)
        .eq("month", month_date.isoformat())
        .limit(1)
        .execute()
    )
    plan_row = plan_resp.data[0] if plan_resp.data else None

    items: list[GroceryItem] = []
    if plan_row:
        items_resp = (
            db.table("grocery_items")
            .select("*")
            .eq("grocery_plan_id", plan_row["id"])
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        items = [_row_to_item(row) for row in items_resp.data]

    estimated_total = sum((item.estimated_total_price for item in items), Decimal("0"))
    budget_amount = Decimal(str(plan_row.get("budget_amount") or 0)) if plan_row else Decimal("0")

    return GroceryPlan(
        month=month_key,
        store_name=plan_row.get("store_name", "Lider") if plan_row else "Lider",
        budget_amount=budget_amount,
        estimated_total=estimated_total,
        remaining_budget=budget_amount - estimated_total,
        items=items,
    )


def save_grocery_plan(user_id: str, month: str | None, payload: GroceryPlanUpdate) -> GroceryPlan:
    month_date = _parse_month(month)
    db = get_db()
    now = datetime.utcnow().isoformat()

    existing_resp = (
        db.table("grocery_plans")
        .select("id")
        .eq("user_id", user_id)
        .eq("month", month_date.isoformat())
        .limit(1)
        .execute()
    )

    plan_row = {
        "user_id": user_id,
        "month": month_date.isoformat(),
        "store_name": payload.store_name,
        "budget_amount": float(payload.budget_amount),
        "updated_at": now,
    }
    if existing_resp.data:
        plan_id = existing_resp.data[0]["id"]
        db.table("grocery_plans").update(plan_row).eq("id", plan_id).execute()
    else:
        plan_id = str(uuid.uuid4())
        plan_row["id"] = plan_id
        plan_row["created_at"] = now
        db.table("grocery_plans").insert(plan_row).execute()

    _replace_items(user_id, plan_id, payload.items)
    return get_grocery_plan(user_id, month_date.strftime("%Y-%m"))


def search_grocery_products(store_name: str, query: str, limit: int = 5) -> list[GrocerySearchResult]:
    normalized_store = _normalize_store_name(store_name)
    cleaned_query = _normalize_whitespace(query)
    if len(cleaned_query) < 2:
        raise ValueError("Search query must have at least 2 characters.")

    if normalized_store == "lider":
        return _search_lider(cleaned_query, limit)
    if normalized_store == "jumbo":
        return _search_jumbo(cleaned_query, limit)
    raise ValueError(f"Store '{store_name}' is not supported yet. Try Lider or Jumbo.")


def _replace_items(user_id: str, plan_id: str, items: list[GroceryItemInput]) -> None:
    db = get_db()
    existing_resp = (
        db.table("grocery_items")
        .select("id")
        .eq("grocery_plan_id", plan_id)
        .eq("user_id", user_id)
        .execute()
    )
    existing_ids = {row["id"] for row in existing_resp.data}
    incoming_ids = {item.id for item in items if item.id}
    now = datetime.utcnow().isoformat()

    for item in items:
        row = {
            "grocery_plan_id": plan_id,
            "user_id": user_id,
            "name": item.name,
            "quantity": float(item.quantity),
            "unit": item.unit,
            "estimated_unit_price": float(item.estimated_unit_price),
            "notes": item.notes,
            "is_checked": item.is_checked,
            "updated_at": now,
        }
        if item.id and item.id in existing_ids:
            db.table("grocery_items").update(row).eq("id", item.id).eq("user_id", user_id).execute()
        else:
            row["id"] = str(uuid.uuid4())
            row["created_at"] = now
            db.table("grocery_items").insert(row).execute()

    for obsolete_id in existing_ids - incoming_ids:
        db.table("grocery_items").delete().eq("id", obsolete_id).eq("user_id", user_id).execute()


def _row_to_item(row: dict) -> GroceryItem:
    quantity = Decimal(str(row.get("quantity") or 0))
    unit_price = Decimal(str(row.get("estimated_unit_price") or 0))
    return GroceryItem(
        id=row["id"],
        name=row["name"],
        quantity=quantity,
        unit=row.get("unit", "unit"),
        estimated_unit_price=unit_price,
        estimated_total_price=quantity * unit_price,
        notes=row.get("notes"),
        is_checked=bool(row.get("is_checked", False)),
        created_at=row.get("created_at", datetime.utcnow()),
        updated_at=row.get("updated_at", datetime.utcnow()),
    )


def _parse_month(month: str | None) -> date:
    raw = month or date.today().strftime("%Y-%m")
    parsed = datetime.strptime(raw, "%Y-%m").date()
    return parsed.replace(day=1)


def _search_lider(query: str, limit: int) -> list[GrocerySearchResult]:
    search_url = f"https://super.lider.cl/v/{_slugify(query)}"
    response = requests.get(search_url, headers=REQUEST_HEADERS, timeout=DEFAULT_GROCERY_TIMEOUT)
    response.raise_for_status()
    results = _extract_lider_json_ld_results(response.text, query, limit)
    if results:
        return results

    anchors = _extract_anchors(response.text)
    fallback_results: list[GrocerySearchResult] = []
    seen: set[tuple[str, str]] = set()
    for anchor in anchors:
        href = anchor.get("href") or ""
        text = anchor.get("text") or ""
        if "/v/" not in href and "lider.cl/v/" not in href:
            continue
        parsed = _parse_lider_anchor_text(text)
        if not parsed:
            continue
        key = (str(parsed["name"]), str(parsed["price_text"]))
        if key in seen:
            continue
        seen.add(key)
        fallback_results.append(
            GrocerySearchResult(
                name=str(parsed["name"]),
                store_name="Lider",
                price=parsed["price"],
                query=query,
                source_url=_absolute_url("https://super.lider.cl", href),
                price_text=str(parsed["price_text"]),
                image_url=None,
            )
        )
        if len(fallback_results) >= limit:
            break
    return fallback_results


def _search_jumbo(query: str, limit: int) -> list[GrocerySearchResult]:
    search_url = f"https://www.jumbo.cl/busqueda?ft={requests.utils.quote(query)}"
    response = requests.get(search_url, headers=REQUEST_HEADERS, timeout=DEFAULT_GROCERY_TIMEOUT)
    response.raise_for_status()
    anchors = _extract_anchors(response.text)

    results: list[GrocerySearchResult] = []
    seen: set[tuple[str, str]] = set()
    for anchor in anchors:
        text = anchor.get("text") or ""
        parsed = _parse_jumbo_anchor_text(text)
        if not parsed:
            continue
        key = (str(parsed["name"]), str(parsed["price_text"]))
        if key in seen:
            continue
        seen.add(key)
        results.append(
            GrocerySearchResult(
                name=str(parsed["name"]),
                store_name="Jumbo",
                price=parsed["price"],
                query=query,
                source_url=_absolute_url("https://www.jumbo.cl", anchor.get("href")),
                price_text=str(parsed["price_text"]),
            )
        )
        if len(results) >= limit:
            break
    return results


def _extract_anchors(html: str) -> list[dict[str, str | None]]:
    parser = _AnchorCollector()
    parser.feed(html)
    return parser.anchors


def _extract_lider_json_ld_results(html: str, query: str, limit: int) -> list[GrocerySearchResult]:
    pattern = r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>'
    scripts = re.findall(pattern, html, flags=re.DOTALL)
    results: list[GrocerySearchResult] = []

    for raw_script in scripts:
        try:
            payload = json.loads(raw_script)
        except json.JSONDecodeError:
            continue

        if payload.get("@type") != "ItemList":
            continue

        for entry in payload.get("itemListElement", []):
            item = entry.get("item") or {}
            offers = item.get("offers") or {}
            raw_price = offers.get("price")
            name = _normalize_whitespace(str(item.get("name") or ""))
            if not raw_price or len(name) < 3:
                continue

            price = Decimal(str(raw_price))
            results.append(
                GrocerySearchResult(
                    name=name,
                    store_name="Lider",
                    price=price,
                    query=query,
                    source_url=item.get("url"),
                    price_text=f"${int(price):,}".replace(",", "."),
                    image_url=item.get("image"),
                )
            )
            if len(results) >= limit:
                return results

    return results


def _parse_lider_anchor_text(text: str) -> dict[str, Decimal | str] | None:
    price_match = re.search(r"\$(\d[\d.]*)", text)
    if not price_match:
        return None

    after_price = _normalize_whitespace(text[price_match.end() :])
    if not after_price or len(after_price) < 4:
        return None

    stop_tokens = (" Despacho", " Agregar", " Rebaja", " Aprovecha", " Ahorra", " Oferta")
    name = after_price
    for token in stop_tokens:
        if token in name:
            name = name.split(token, 1)[0].strip()
    if len(name) < 3:
        return None

    price_text = f"${price_match.group(1)}"
    return {
        "name": name,
        "price": _parse_price(price_text),
        "price_text": price_text,
    }


def _parse_jumbo_anchor_text(text: str) -> dict[str, Decimal | str] | None:
    prices = re.findall(r"\$(\d[\d.]*)", text)
    if not prices:
        return None

    price_text = f"${prices[0]}"
    clean_text = _normalize_whitespace(text)

    product_match = re.search(
        r"(?:[A-Z][\w&]+(?:\s+[A-Z][\w&]+){0,2})\s+(.*?)(?:Agregar|Lleva|Paga|\$\d|$)",
        clean_text,
    )
    if not product_match:
        return None

    name = _normalize_whitespace(product_match.group(1))
    if len(name) < 3:
        return None

    return {
        "name": name,
        "price": _parse_price(price_text),
        "price_text": price_text,
    }


def _parse_price(raw_price: str) -> Decimal:
    normalized = raw_price.replace("$", "").replace(".", "").replace(",", ".").strip()
    return Decimal(normalized)


def _normalize_store_name(store_name: str) -> str:
    return _normalize_whitespace(store_name).lower()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "producto"


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _absolute_url(base_url: str, href: str | None) -> str | None:
    if not href:
        return None
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("/"):
        return f"{base_url}{href}"
    return f"{base_url}/{href}"
