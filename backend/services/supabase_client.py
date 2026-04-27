"""
Supabase client service.
Wraps the Supabase Python SDK using the Service Role Key
so the backend can bypass RLS for admin-level operations.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from config import get_settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Create and cache a single Supabase admin client.
    Uses the **Service Role Key** – never expose this to the frontend.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)
