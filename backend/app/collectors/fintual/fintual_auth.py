import logging
import requests
from app.config import get_settings

logger = logging.getLogger(__name__)
FINTUAL_BASE_URL = "https://fintual.cl/api"


def get_fintual_token() -> str:
    """Authenticate with Fintual and return a session token."""
    settings = get_settings()
    email = settings.fintual_email
    password = settings.fintual_password

    if not email or not password:
        raise ValueError("Fintual credentials not configured (FINTUAL_EMAIL / FINTUAL_PASSWORD)")

    payload = {"user": {"email": email, "password": password}}

    response = requests.post(
        f"{FINTUAL_BASE_URL}/access_tokens",
        json=payload,
        timeout=10,
    )

    if response.status_code == 401:
        raise ValueError("Fintual credentials unauthorized. Comprueba FINTUAL_EMAIL y FINTUAL_PASSWORD en .env")

    response.raise_for_status()

    data = response.json()
    try:
        return data["data"]["attributes"]["token"]
    except KeyError:
        raise ValueError(f"Unexpected Fintual auth response format: {data}")
