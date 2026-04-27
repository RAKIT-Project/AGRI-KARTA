"""
Google Gemini AI service.
Generates personalized daily digest copywriting for WhatsApp notifications.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import google.generativeai as genai

from config import get_settings

logger = logging.getLogger(__name__)

# ── Gemini Initialization ────────────────────────────────────────────────────
_configured = False


def _ensure_configured() -> None:
    """Configure Gemini API key once."""
    global _configured
    if not _configured:
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


# ── System Prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
Kamu adalah "AGRI-KARTA", asisten cerdas untuk petani dan pedagang komoditas Indonesia.

Tugasmu:
- Menulis pesan notifikasi harian (Daily Digest) untuk WhatsApp.
- Bahasa: Bahasa Indonesia yang ramah, mudah dipahami, dan actionable.
- Format: Gunakan emoji yang relevan, bullet points singkat, dan angka yang jelas.
- Panjang: Maksimal 500 karakter per pesan (batasan WhatsApp).
- Sertakan:
  1. Ringkasan harga hari ini vs kemarin.
  2. Prediksi tren 7 hari ke depan (naik/turun/stabil).
  3. Saran aksi sederhana berdasarkan alert pengguna.
  4. Salam penutup yang memotivasi.
"""


async def generate_daily_digest(
    user_name: str,
    scraped_prices: List[Dict[str, Any]],
    predictions: List[Dict[str, Any]],
    user_alerts: List[Dict[str, Any]],
) -> str:
    """
    Generate a personalized daily digest message using Gemini.

    Args:
        user_name:      Display name of the recipient.
        scraped_prices: Today's scraped prices (list of dicts with commodity, price).
        predictions:    7-day predictions (list of dicts with commodity, predicted prices).
        user_alerts:    Active price alerts for this user.

    Returns:
        A WhatsApp-ready notification string (≤ 500 chars).
    """
    _ensure_configured()

    # Build the dynamic user prompt
    user_prompt = f"""\
Buatkan pesan Daily Digest untuk pengguna bernama "{user_name}".

## Data Harga Hari Ini:
{_format_prices(scraped_prices)}

## Prediksi 7 Hari Ke Depan:
{_format_predictions(predictions)}

## Alert Aktif Pengguna:
{_format_alerts(user_alerts)}

Tulis pesan WhatsApp yang personal, singkat (≤500 karakter), dan actionable.
"""

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        response = await model.generate_content_async(user_prompt)

        if response.text:
            logger.info("Generated digest for %s (%d chars)", user_name, len(response.text))
            return response.text.strip()

        logger.warning("Gemini returned empty response for %s", user_name)
        return _fallback_message(user_name)

    except Exception as exc:
        logger.error("Gemini API error for %s: %s", user_name, exc)
        return _fallback_message(user_name)


# ── Helper Formatters ────────────────────────────────────────────────────────
def _format_prices(prices: List[Dict[str, Any]]) -> str:
    """Format scraped prices into a readable string for the prompt."""
    if not prices:
        return "Tidak ada data harga hari ini."
    lines = []
    for p in prices:
        lines.append(
            f"- {p.get('commodity_name', 'N/A')}: Rp {p.get('actual_price', 0):,.0f}/{p.get('unit', 'kg')}"
        )
    return "\n".join(lines)


def _format_predictions(predictions: List[Dict[str, Any]]) -> str:
    """Format predictions into a readable string for the prompt."""
    if not predictions:
        return "Tidak ada prediksi tersedia."
    lines = []
    for p in predictions:
        lines.append(
            f"- {p.get('commodity_name', 'N/A')}: "
            f"Prediksi Rp {p.get('predicted_price', 0):,.0f} pada {p.get('date', 'N/A')}"
        )
    return "\n".join(lines)


def _format_alerts(alerts: List[Dict[str, Any]]) -> str:
    """Format user alerts into a readable string for the prompt."""
    if not alerts:
        return "Tidak ada alert aktif."
    lines = []
    for a in alerts:
        direction = "di atas" if a.get("alert_type") == "above" else "di bawah"
        lines.append(
            f"- {a.get('commodity_name', 'N/A')}: "
            f"Alert jika harga {direction} Rp {a.get('threshold_price', 0):,.0f}"
        )
    return "\n".join(lines)


def _fallback_message(user_name: str) -> str:
    """Static fallback message if Gemini fails."""
    return (
        f"🌾 Selamat pagi, {user_name}!\n\n"
        "Maaf, ringkasan harian belum tersedia saat ini. "
        "Silakan cek aplikasi AGRI-KARTA untuk info terbaru.\n\n"
        "Semangat! 💪"
    )
