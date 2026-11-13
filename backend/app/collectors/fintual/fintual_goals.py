import logging
import requests
from decimal import Decimal
from app.config import get_settings
from app.collectors.fintual.fintual_auth import get_fintual_token
from app.utils.numbers import to_decimal

logger = logging.getLogger(__name__)
FINTUAL_BASE_URL = "https://fintual.cl/api"


def get_fintual_goals() -> list[dict]:
    """
    Fetch all Fintual goals (investment portfolios) for the user.
    Tries several auth methods in order since the Fintual API has changed over time.
    """
    token = get_fintual_token()
    email = get_settings().fintual_email

    # (headers, params) pairs to try, most likely first
    attempts = [
        # Method 1: Bearer header + query params (newer API)
        (
            {"Authorization": f"Bearer {token}"},
            {"user_email": email, "user_token": token},
        ),
        # Method 2: Bearer header only
        (
            {"Authorization": f"Bearer {token}"},
            {},
        ),
        # Method 3: query params only (original API)
        (
            {},
            {"user_email": email, "user_token": token},
        ),
    ]

    last_response = None
    for hdrs, params in attempts:
        try:
            response = requests.get(
                f"{FINTUAL_BASE_URL}/goals",
                params=params,
                headers=hdrs,
                timeout=10,
            )
            last_response = response
            if response.status_code == 200:
                return response.json()["data"]
            if response.status_code not in (401, 403):
                response.raise_for_status()
            logger.debug(f"Fintual attempt failed {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.debug(f"Fintual attempt exception: {e}")

    body = last_response.text[:500] if last_response else "no response"
    raise ValueError(
        f"Fintual /goals: all auth methods returned 401/403. "
        f"Check credentials or Fintual API. Response: {body}"
    )


def get_fintual_holdings() -> list[dict]:
    """
    Return a structured list of Fintual holdings.
    Each goal in Fintual is treated as a 'fund' holding.
    """
    goals = get_fintual_goals()
    holdings = []

    for goal in goals:
        attrs = goal.get("attributes", {})
        nav = attrs.get("nav")
        name = attrs.get("name", "Fintual Fund")

        if nav is None:
            logger.warning(f"Fintual goal '{name}' has no NAV — skipping")
            continue

        holdings.append({
            "name": name,
            "ticker": None,
            "platform": "fintual",
            "asset_class": "fund",
            "quantity": Decimal("1"),          # NAV is the total value
            "current_value": to_decimal(nav, 0),
            "currency": "CLP",
            "current_value_clp": to_decimal(nav, 0),
        })

    return holdings


def get_fintual_total() -> int:
    """Return total Fintual portfolio value in CLP (integer)."""
    try:
        goals = get_fintual_goals()
    except Exception as e:
        logger.warning(f"Fintual fetch failed: {e}")
        return 0

    total = 0
    for goal in goals:
        nav = goal.get("attributes", {}).get("nav")
        if nav is not None:
            total += int(nav)
    return total
