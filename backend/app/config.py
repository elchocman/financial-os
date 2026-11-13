from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Financial OS API"
    debug: bool = False
    base_currency: str = "CLP"

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Fintual
    fintual_email: str = ""
    fintual_password: str = ""

    # Racional (holdings stored as env vars — mirrors existing approach)
    racional_ltm_shares: float = 0.0
    racional_cfisp500_shares: float = 0.0
    racional_meta_shares: float = 0.0
    racional_amzn_shares: float = 0.0
    racional_msft_shares: float = 0.0

    # Binance
    binance_btc_amount: float = 0.0
    binance_api_key: str = ""
    binance_api_secret: str = ""

    # Auth
    jwt_secret: str = "SHOULD_BE_CHANGED_IN_PROD"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
