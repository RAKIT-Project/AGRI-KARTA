"""
Centralized configuration loaded from environment variables.
Uses pydantic-style validation via a frozen dataclass.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Immutable application settings – validated once at startup."""

    # ── Supabase ────────────────────────────────────
    supabase_url: str
    supabase_service_key: str

    # ── Meta WhatsApp Business API ──────────────────
    wa_verify_token: str
    wa_access_token: str
    wa_phone_number_id: str

    # ── Google Gemini ───────────────────────────────
    gemini_api_key: str

    # ── Cron Security ──────────────────────────────
    cron_secret: str


def _require_env(key: str) -> str:
    """Return env var or raise with a clear message."""
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(f"Missing required environment variable: {key}")
    return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Singleton factory – called once, cached forever.
    Used as a FastAPI dependency via `Depends(get_settings)`.
    """
    return Settings(
        supabase_url=_require_env("SUPABASE_URL"),
        supabase_service_key=_require_env("SUPABASE_SERVICE_KEY"),
        wa_verify_token=_require_env("WA_VERIFY_TOKEN"),
        wa_access_token=_require_env("WA_ACCESS_TOKEN"),
        wa_phone_number_id=_require_env("WA_PHONE_NUMBER_ID"),
        gemini_api_key=_require_env("GEMINI_API_KEY"),
        cron_secret=_require_env("CRON_SECRET"),
    )
