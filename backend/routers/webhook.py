"""
WhatsApp Webhook Router.
Handles Meta webhook verification (GET) and incoming messages (POST).
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from config import Settings, get_settings
from services.supabase_client import get_supabase_client
from services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["WhatsApp Webhook"])

# ── Activation keyword ──────────────────────────────────────────────────────
ACTIVATION_KEYWORD = "AKTIFKAN AGRI-KARTA"


# ═════════════════════════════════════════════════════════════════════════════
# GET /webhook/whatsapp — Meta Hub Challenge Verification
# ═════════════════════════════════════════════════════════════════════════════
@router.get("/whatsapp", summary="Verify Meta Webhook")
async def verify_webhook(
    settings: Settings = Depends(get_settings),
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
) -> int:
    """
    Meta sends a GET request with hub.mode, hub.challenge, and hub.verify_token.
    We must respond with the hub.challenge value if the token matches.

    Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.wa_verify_token:
        logger.info("Webhook verified successfully")
        return int(hub_challenge or 0)

    logger.warning("Webhook verification failed – token mismatch")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch",
    )


# ═════════════════════════════════════════════════════════════════════════════
# POST /webhook/whatsapp — Incoming Messages
# ═════════════════════════════════════════════════════════════════════════════
@router.post(
    "/whatsapp",
    status_code=status.HTTP_200_OK,
    summary="Receive WhatsApp messages",
)
async def receive_message(request: Request) -> Dict[str, str]:
    """
    Process incoming WhatsApp messages from Meta Cloud API.

    Workflow:
        1. Parse the webhook payload.
        2. Extract sender phone number and message text.
        3. If the message contains "AKTIFKAN AGRI-KARTA":
           a. Query Supabase `users` table for matching phone_number.
           b. Update is_wa_verified = True.
           c. Send confirmation reply via WhatsApp.
        4. Always return 200 to acknowledge receipt (Meta requirement).
    """
    body: Dict[str, Any] = await request.json()

    # ── Extract message data from Meta webhook payload ──────────────────
    try:
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            # Status update or other non-message event — acknowledge silently
            return {"status": "ok", "detail": "No message to process"}

        message = messages[0]
        sender_phone = message.get("from", "")
        message_text = message.get("text", {}).get("body", "")

    except (IndexError, KeyError, TypeError) as exc:
        logger.error("Failed to parse webhook payload: %s", exc)
        return {"status": "ok", "detail": "Malformed payload"}

    logger.info(
        "Received message from %s: %s",
        sender_phone[:6] + "***",
        message_text[:50],
    )

    # ── Check for activation keyword ────────────────────────────────────
    if ACTIVATION_KEYWORD in message_text.upper():
        await _handle_activation(sender_phone)

    return {"status": "ok"}


async def _handle_activation(phone_number: str) -> None:
    """
    Handle the AGRI-KARTA activation flow:
    1. Query Supabase for user with matching phone_number.
    2. Set is_wa_verified = True.
    3. Send a WhatsApp confirmation message.
    """
    supabase = get_supabase_client()

    try:
        # ── Step 1: Find user by phone number ──────────────────────────
        result = (
            supabase.table("users")
            .select("id, full_name, phone_number, is_wa_verified")
            .eq("phone_number", phone_number)
            .execute()
        )

        if not result.data:
            logger.warning("Activation attempt from unregistered phone: %s***", phone_number[:6])
            await send_whatsapp_message(
                phone_number,
                "⚠️ Nomor Anda belum terdaftar di AGRI-KARTA. "
                "Silakan daftar terlebih dahulu di aplikasi.",
            )
            return

        user = result.data[0]

        # ── Step 2: Skip if already verified ───────────────────────────
        if user.get("is_wa_verified"):
            await send_whatsapp_message(
                phone_number,
                "✅ WhatsApp Anda sudah terverifikasi sebelumnya. "
                "Anda akan menerima notifikasi harian AGRI-KARTA.",
            )
            return

        # ── Step 3: Update verification status ─────────────────────────
        supabase.table("users").update({"is_wa_verified": True}).eq(
            "id", user["id"]
        ).execute()

        logger.info("User %s verified via WhatsApp", user["id"])

        # ── Step 4: Send confirmation ──────────────────────────────────
        display_name = user.get("full_name") or "Pengguna"
        await send_whatsapp_message(
            phone_number,
            f"🎉 Selamat, {display_name}!\n\n"
            "WhatsApp Anda berhasil diverifikasi untuk AGRI-KARTA. "
            "Anda akan menerima notifikasi harga komoditas setiap pagi.\n\n"
            "Terima kasih telah bergabung! 🌾",
        )

    except Exception as exc:
        logger.error("Activation error for %s: %s", phone_number[:6] + "***", exc)
        await send_whatsapp_message(
            phone_number,
            "⚠️ Terjadi kesalahan saat verifikasi. Silakan coba lagi nanti.",
        )
