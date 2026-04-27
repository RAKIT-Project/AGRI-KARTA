"""
Wablas WhatsApp API client service.
Handles sending text messages via the Wablas HTTP POST API.

Migration note:
    This service previously used the Meta WhatsApp Cloud API
    (graph.facebook.com/v21.0). It has been fully migrated to the
    Wablas HTTP API which uses a simpler Authorization-header + JSON body
    pattern without an OAuth token exchange step.

DRY_RUN mode:
    Controlled by the ``WABLAS_DRY_RUN`` environment variable (default: True).
    When enabled the function logs the full payload and returns True
    immediately WITHOUT making any HTTP request.  This protects the Wablas
    free-tier 10-message quota during development and CI runs.
    Set ``WABLAS_DRY_RUN=false`` only in a verified production environment.
"""

from __future__ import annotations

import logging

import httpx
from config import get_settings

logger = logging.getLogger(__name__)


async def send_whatsapp_message(to_phone: str, message: str) -> bool:
    """
    Send a text message to a WhatsApp number via the Wablas API.

    The endpoint used is::

        POST {WABLAS_DOMAIN}/api/send-message

    with the following JSON body::

        {"phone": "<international_number>", "message": "<text>"}

    Args:
        to_phone: Recipient phone number in international format,
                  e.g. ``"6281234567890"`` (no ``+`` prefix).
        message:  Plain-text body to deliver. Keep ≤ 4096 chars for
                  WhatsApp compatibility.

    Returns:
        ``True`` if the message was accepted by Wablas (or simulated in
        DRY_RUN mode). ``False`` on any HTTP or parsing failure.
    """
    settings = get_settings()

    payload: dict[str, str] = {
        "phone": to_phone,
        "message": message,
    }

    # ── DRY RUN GUARD ─────────────────────────────────────────────────────
    # When WABLAS_DRY_RUN=true (the safe default) no HTTP request is made.
    # The full payload is logged at INFO level so behaviour can be audited
    # without consuming any of the Wablas message quota.
    if settings.wablas_dry_run:
        logger.info(
            "[DRY RUN] WhatsApp message suppressed (WABLAS_DRY_RUN=true). "
            "Recipient: %s | Payload: %s",
            _mask_phone(to_phone),
            payload,
        )
        return True

    # ── LIVE: Send via Wablas HTTP API ────────────────────────────────────
    url = f"{settings.wablas_domain}/api/send-message"

    headers = {
        # Wablas uses a plain token in the Authorization header –
        # no "Bearer" prefix is required by the Wablas API spec.
        "Authorization": settings.wablas_token,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)

        # Wablas returns {"status": true, "message": "success", "data": {...}}
        # on success and {"status": false, "message": "<reason>"} on failure.
        try:
            data = response.json()
        except Exception:
            logger.error(
                "Wablas returned non-JSON response (%d): %.200s",
                response.status_code,
                response.text,
            )
            return False

        if response.status_code == 200 and data.get("status") is True:
            logger.info(
                "WhatsApp message delivered to %s via Wablas",
                _mask_phone(to_phone),
            )
            return True

        logger.error(
            "Wablas API rejected message (HTTP %d): %s",
            response.status_code,
            data.get("message", response.text),
        )
        return False

    except httpx.TimeoutException:
        logger.error(
            "Wablas request timed out for recipient %s",
            _mask_phone(to_phone),
        )
        return False

    except httpx.HTTPError as exc:
        logger.error(
            "Wablas HTTP transport error for recipient %s: %s",
            _mask_phone(to_phone),
            exc,
        )
        return False


# ── Private helpers ───────────────────────────────────────────────────────────


def _mask_phone(phone: str) -> str:
    """
    Redact the middle digits of a phone number for safe log output.

    Example::

        "6281234567890"  →  "628***7890"
    """
    if len(phone) > 7:
        return phone[:3] + "***" + phone[-4:]
    return "***"
