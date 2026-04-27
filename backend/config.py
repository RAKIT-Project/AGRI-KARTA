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

    # ── Wablas WhatsApp API ─────────────────────────
    # wablas_domain: e.g. "https://solo.wablas.com"
    # wablas_dry_run: when True, messages are only logged – no HTTP request
    #                 is made. Defaults to True to protect the 10-message quota.
    wablas_token: str
    wablas_domain: str
    wablas_dry_run: bool

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


def _parse_bool(value: str | None, default: bool) -> bool:
    """
    Parse a string env var into a boolean.

    Truthy strings: "true", "1", "yes" (case-insensitive).
    If the env var is absent, ``default`` is returned.
    """
    if value is None:
        return default
    return value.strip().lower() in ("true", "1", "yes")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Singleton factory – called once, cached forever.
    Used as a FastAPI dependency via ``Depends(get_settings)``.

    Required environment variables:
        SUPABASE_URL, SUPABASE_SERVICE_KEY   – Supabase project credentials.
        WABLAS_TOKEN, WABLAS_DOMAIN          – Wablas API credentials.
        GEMINI_API_KEY                       – Google Gemini API key.
        CRON_SECRET                          – Bearer token for cron endpoints.

    Optional environment variables:
        WABLAS_DRY_RUN   – Set to "false" to enable live WhatsApp delivery.
                           Defaults to "true" (safe default, no HTTP requests).
    """
    return Settings(
        supabase_url=_require_env("SUPABASE_URL"),
        supabase_service_key=_require_env("SUPABASE_SERVICE_KEY"),
        wablas_token=_require_env("WABLAS_TOKEN"),
        wablas_domain=_require_env("WABLAS_DOMAIN"),
        wablas_dry_run=_parse_bool(os.getenv("WABLAS_DRY_RUN"), default=True),
        gemini_api_key=_require_env("GEMINI_API_KEY"),
        cron_secret=_require_env("CRON_SECRET"),
    )
