"""
Wablas WhatsApp Webhook Router.
Handles incoming messages forwarded by the Wablas gateway (POST only).

Wablas vs. Meta payload differences
─────────────────────────────────────────────────────────────────────────────
The previous implementation targeted the Meta WhatsApp Cloud API, which
required two endpoints:

  • GET  /webhook/whatsapp  — Hub-challenge verification (Meta-specific).
  • POST /webhook/whatsapp  — Deeply-nested JSON arrays.

Wablas operates differently:

  • No GET challenge-verification step. Wablas does not ping a challenge
    URL before starting to deliver events.
  • Flat JSON payload per message event (no nested entry/changes/value
    arrays). The body sent by Wablas looks like:

        {
            "phone":       "628xxxxxxxxxx",
            "message":     "text body",
            "sender":      "628xxxxxxxxxx",
            "senderName":  "Display Name",
            "messageType": "text",
            "timestamp":   "YYYY-MM-DD HH:MM:SS",
            "deviceId":    "xxx"
        }

  • Always respond HTTP 200. If Wablas does not receive 200 it will retry
    the delivery, so every code path in this router returns 200.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, Request, status
from services.supabase_client import get_supabase_client
from services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["WhatsApp Webhook"])

# ── Activation keyword ────────────────────────────────────────────────────────
# When a user sends this exact phrase (case-insensitive) to the Wablas number,
# their WhatsApp account is linked to their AGRI-KARTA profile.
ACTIVATION_KEYWORD = "AKTIFKAN AGRI-KARTA"


# =============================================================================
# POST /webhook/whatsapp — Wablas Incoming Message Events
# =============================================================================


@router.post(
    "/whatsapp",
    status_code=status.HTTP_200_OK,
    summary="Receive incoming messages from the Wablas gateway",
)
async def receive_message(request: Request) -> Dict[str, str]:
    """
    Process incoming WhatsApp messages forwarded by the Wablas gateway.

    Wablas delivers one flat JSON object per message event to this endpoint.
    Every request is acknowledged with HTTP 200 so that Wablas does not retry.

    Workflow:
        1. Parse the flat Wablas JSON body.
        2. Validate that ``phone`` is present.
        3. Ignore non-text message types (images, documents, audio, etc.).
        4. If the text body contains ACTIVATION_KEYWORD:
               a. Query Supabase ``users`` table for the matching phone number.
               b. Set ``is_wa_verified = True``.
               c. Send a confirmation reply via the Wablas API.
        5. Return {"status": "ok"} regardless of the processing outcome
           to prevent Wablas from retrying the delivery.
    """
    # ── 1. Parse JSON body ────────────────────────────────────────────────────
    try:
        body: Dict[str, Any] = await request.json()
    except Exception as exc:
        logger.error("Failed to parse Wablas webhook body as JSON: %s", exc)
        # Return 200 even on parse failure.
        # Retrying a malformed payload will not fix the problem.
        return {"status": "ok", "detail": "Malformed JSON body"}

    # ── 2. Extract flat Wablas fields ─────────────────────────────────────────
    # Wablas sends "phone" for the sender.
    # "sender" is a fallback alias used by some Wablas firmware versions.
    sender_phone: str = body.get("phone", "") or body.get("sender", "")
    message_text: str = body.get("message", "")
    message_type: str = body.get("messageType", "text")

    if not sender_phone:
        logger.warning(
            "Wablas webhook received with no identifiable sender. Body keys: %s",
            list(body.keys()),
        )
        return {"status": "ok", "detail": "Missing sender phone field"}

    # ── 3. Ignore non-text messages ───────────────────────────────────────────
    # Images, documents, audio clips, and stickers do not carry a text body
    # that could contain the activation keyword. Skip them silently.
    if message_type != "text":
        logger.debug(
            "Ignoring non-text Wablas event (messageType=%r) from %s",
            message_type,
            _mask_phone(sender_phone),
        )
        return {"status": "ok", "detail": "Non-text message type ignored"}

    logger.info(
        "Wablas incoming text from %s: %.60r",
        _mask_phone(sender_phone),
        message_text,
    )

    # ── 4. Activation keyword check ───────────────────────────────────────────
    if ACTIVATION_KEYWORD in message_text.upper():
        await _handle_activation(sender_phone)

    # ── 5. Acknowledge ────────────────────────────────────────────────────────
    return {"status": "ok"}


# ── Private helpers ───────────────────────────────────────────────────────────


async def _handle_activation(phone_number: str) -> None:
    """
    Handle the AGRI-KARTA WhatsApp activation flow.

    Queries Supabase for the user whose phone_number matches the sender,
    sets is_wa_verified = True, and sends a confirmation reply through
    the Wablas API. All errors are caught and logged; a user-friendly error
    message is sent back via WhatsApp so the sender knows to try again.

    Args:
        phone_number: Sender phone in international format, e.g. "6281234567890".
    """
    supabase = get_supabase_client()
    masked = _mask_phone(phone_number)

    try:
        # ── Step 1: Look up user by phone number ──────────────────────────────
        result = (
            supabase.table("users")
            .select("id, full_name, phone_number, is_wa_verified")
            .eq("phone_number", phone_number)
            .execute()
        )

        if not result.data:
            logger.warning("Activation attempt from unregistered number %s", masked)
            await send_whatsapp_message(
                phone_number,
                "⚠️ Nomor Anda belum terdaftar di AGRI-KARTA. "
                "Silakan daftar terlebih dahulu di aplikasi.",
            )
            return

        user = result.data[0]

        # ── Step 2: Short-circuit if already verified ─────────────────────────
        if user.get("is_wa_verified"):
            logger.info("Number %s is already verified – skipping update", masked)
            await send_whatsapp_message(
                phone_number,
                "✅ WhatsApp Anda sudah terverifikasi sebelumnya. "
                "Anda akan menerima notifikasi harian AGRI-KARTA.",
            )
            return

        # ── Step 3: Mark the user as WhatsApp-verified ────────────────────────
        supabase.table("users").update({"is_wa_verified": True}).eq(
            "id", user["id"]
        ).execute()

        logger.info(
            "User %s successfully verified via WhatsApp activation keyword",
            user["id"],
        )

        # ── Step 4: Send confirmation message ─────────────────────────────────
        display_name: str = user.get("full_name") or "Pengguna"
        await send_whatsapp_message(
            phone_number,
            f"🎉 Selamat, {display_name}!\n\n"
            "WhatsApp Anda berhasil diverifikasi untuk AGRI-KARTA. "
            "Anda akan menerima notifikasi harga komoditas setiap pagi.\n\n"
            "Terima kasih telah bergabung! 🌾",
        )

    except Exception as exc:
        logger.error(
            "Activation error for %s: %s",
            masked,
            exc,
        )
        # Best-effort error reply.
        # If this send also fails, main.py's global exception handler logs it.
        await send_whatsapp_message(
            phone_number,
            "⚠️ Terjadi kesalahan saat verifikasi. Silakan coba lagi nanti.",
        )


def _mask_phone(phone: str) -> str:
    """
    Redact the middle digits of a phone number for safe log output.

    Example:
        "6281234567890"  ->  "628***7890"
    """
    if len(phone) > 7:
        return phone[:3] + "***" + phone[-4:]
    return "***"
