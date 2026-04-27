"""
WhatsApp Cloud API client service.
Handles sending text messages via the Meta WhatsApp Business API.
"""

from __future__ import annotations

import logging

import httpx

from config import get_settings

logger = logging.getLogger(__name__)

WA_API_BASE = "https://graph.facebook.com/v21.0"


async def send_whatsapp_message(to_phone: str, message: str) -> bool:
    """
    Send a text message to a WhatsApp number via Meta Cloud API.

    Args:
        to_phone: Recipient phone number in international format (e.g., "6281234567890").
        message:  The text body to send.

    Returns:
        True if the message was accepted by the API, False otherwise.
    """
    settings = get_settings()
    url = f"{WA_API_BASE}/{settings.wa_phone_number_id}/messages"

    headers = {
        "Authorization": f"Bearer {settings.wa_access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            logger.info("WhatsApp message sent to %s", _mask_phone(to_phone))
            return True

        logger.error(
            "WhatsApp API error (%d): %s",
            response.status_code,
            response.text,
        )
        return False

    except httpx.HTTPError as exc:
        logger.error("WhatsApp HTTP error sending to %s: %s", _mask_phone(to_phone), exc)
        return False


def _mask_phone(phone: str) -> str:
    """Mask phone number for logging: 6281234567890 → 628***7890."""
    if len(phone) > 7:
        return phone[:3] + "***" + phone[-4:]
    return "***"
