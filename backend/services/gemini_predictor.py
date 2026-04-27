"""
Gemini 2.0 Flash price prediction service (JSON Mode).
Generates a 7-day commodity price forecast using Gemini Structured Output.

JSON MODE ENFORCEMENT
---------------------
The output schema is enforced at the API level through:

    genai.GenerationConfig(response_mime_type="application/json")

This is categorically different from merely asking the model to reply in
JSON inside the prompt text. With response_mime_type="application/json"
set, the Gemini API tokeniser constrains the sampling process so that the
raw bytes of the response are guaranteed to be valid JSON. The model
cannot produce prose, markdown fences, or partial tokens that break JSON
syntax.

The prompt still includes an explicit schema description so the model
understands the shape of the required JSON, but the guarantee of
parseability comes from the API parameter, not the prompt wording.

Reference:
    https://ai.google.dev/gemini-api/docs/structured-output
    Requires google-generativeai >= 0.8.0 (see requirements.txt).

Data Integrity:
    The caller may supply historical_prices that contain None values for
    days where the scraper returned no data. This service filters those
    values out before building the prompt context.
    DILARANG KERAS menggunakan forward-fill data. None slots are simply
    excluded from the trend context, not replaced with the prior day's
    value.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Optional

import google.generativeai as genai
from config import get_settings

logger = logging.getLogger(__name__)


# =============================================================================
# Gemini SDK initialisation
# =============================================================================

_configured = False


def _ensure_configured() -> None:
    """Configure the Gemini SDK with the project API key exactly once."""
    global _configured
    if not _configured:
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


# =============================================================================
# Output data model
# =============================================================================


@dataclass
class PredictionResult:
    """
    A single 7-day price prediction point ready for database insertion.

    Field names mirror the price_predictions table schema so that
    dataclasses.asdict(result) can be passed directly to a Supabase upsert.
    """

    commodity_id: int
    region_id: int
    target_date: str  # ISO-8601 string: YYYY-MM-DD
    predicted_price: float


# =============================================================================
# JSON Mode generation config  (module-level constant – created once)
#
# response_mime_type="application/json" activates Gemini JSON Mode.
# The API constrains token sampling so the response is always parseable JSON.
# json.loads(response.text) is therefore safe to call without a try/except,
# though we still wrap it defensively against edge cases in older SDK builds.
#
# temperature=0.2 keeps forecasts deterministic and low-variance while still
# allowing the model to interpolate a smooth price trend from the history.
# =============================================================================

_JSON_GENERATION_CONFIG = genai.GenerationConfig(
    response_mime_type="application/json",
    temperature=0.2,
)


# =============================================================================
# Prompt templates
#
# The schema shape is described inside the prompt so the model understands
# WHAT structure to produce. The GUARANTEE that the output is parseable JSON
# comes exclusively from _JSON_GENERATION_CONFIG above, not from this text.
# =============================================================================

_SYSTEM_INSTRUCTION = (
    "Kamu adalah sistem prediksi harga komoditas pangan untuk wilayah "
    "Daerah Istimewa Yogyakarta, Indonesia.\n\n"
    "Tugasmu adalah menganalisis tren harga historis dan menghasilkan prediksi "
    "harga untuk 7 hari ke depan.\n\n"
    "Aturan output MUTLAK:\n"
    "- Keluarkan HANYA array JSON murni tanpa teks, komentar, atau markdown.\n"
    '- Setiap elemen array adalah objek dengan dua field: "date" '
    '(string YYYY-MM-DD) dan "price" (integer Rupiah per kg, tanpa desimal).\n'
    "- Array harus berisi tepat 7 elemen, satu per hari prediksi.\n"
    "- Contoh format yang benar:\n"
    '  [{"date": "2025-01-01", "price": 15000}, '
    '{"date": "2025-01-02", "price": 15200}]'
)

_USER_PROMPT_TEMPLATE = (
    "Berikut data harga historis untuk Komoditas ID={commodity_id} "
    "di Wilayah ID={region_id} (satuan: Rupiah per kg):\n\n"
    "{price_history_block}\n\n"
    "Total {n_points} data poin valid (dari {context_window} hari terakhir) "
    "digunakan sebagai konteks tren.\n\n"
    "Berikan prediksi harga untuk 7 hari berurutan mulai dari:\n"
    "  Hari ke-1: {day1}\n"
    "  Hari ke-7: {day7}\n\n"
    "Perhatikan tren naik/turun/stabil dalam data historis dan proyeksikan "
    'secara realistis. Nilai "price" harus berupa integer (bulat ke satuan '
    "Rupiah terdekat)."
)

# Maximum number of historical data points fed to the model as trend context.
_CONTEXT_WINDOW = 30

# Minimum number of valid (non-None) data points required before calling the
# API. Fewer than this produces an unreliable forecast.
_MIN_VALID_POINTS = 7


# =============================================================================
# Public API
# =============================================================================


async def run_gemini_prediction(
    commodity_id: int,
    region_id: int,
    historical_prices: List[Optional[float]],
) -> List[PredictionResult]:
    """
    Generate a 7-day commodity price forecast using Gemini 2.0 Flash.

    JSON Mode Guarantee
    -------------------
    The output is constrained to valid JSON at the API level via:

        genai.GenerationConfig(response_mime_type="application/json")

    This means json.loads() on the response text is always safe. The model
    cannot emit prose or markdown that would break parsing. The prompt
    additionally describes the required array schema so the model knows the
    exact shape to populate.

    None Handling
    -------------
    historical_prices may contain None values from days where the scraper
    returned no data. These are filtered out before building the prompt
    context. They are NOT replaced with adjacent values (no forward-fill or
    backward-fill). If fewer than _MIN_VALID_POINTS valid prices remain
    after filtering, the function returns an empty list and logs a warning
    rather than producing an unreliable forecast.

    Args:
        commodity_id:      Database ID of the commodity to forecast.
        region_id:         Database ID of the region.
        historical_prices: Ordered list (oldest to newest) of recent actual
                           prices. May contain None for unavailable days.

    Returns:
        List of up to 7 PredictionResult objects (one per forecast day), or
        an empty list if there is insufficient data or if the API call fails.
    """
    _ensure_configured()

    # -------------------------------------------------------------------------
    # Step 1: Filter out None values.
    #
    # DILARANG KERAS menggunakan forward-fill data.
    # Biarkan None jika scraping gagal / data belum rilis.
    # None entries are simply dropped; they are never replaced with the most
    # recent non-None value.
    # -------------------------------------------------------------------------
    valid_prices: List[float] = [p for p in historical_prices if p is not None]

    if len(valid_prices) < _MIN_VALID_POINTS:
        logger.warning(
            "Commodity %d, region %d: only %d valid price points available "
            "(minimum required: %d). Skipping Gemini prediction.",
            commodity_id,
            region_id,
            len(valid_prices),
            _MIN_VALID_POINTS,
        )
        return []

    # -------------------------------------------------------------------------
    # Step 2: Build trend context from the last _CONTEXT_WINDOW valid points.
    #
    # The list is already ordered oldest-to-newest because cron.py reverses
    # the DESC query result before passing it here.
    # We format the prices as a numbered list so the model reads them
    # chronologically (entry [1] is the oldest, entry [N] is the most recent).
    # -------------------------------------------------------------------------
    context_prices: List[float] = valid_prices[-_CONTEXT_WINDOW:]
    n_points: int = len(context_prices)

    price_history_block: str = "\n".join(
        f"  [{i + 1:>2}] Rp {price:>10,.0f}" for i, price in enumerate(context_prices)
    )

    # -------------------------------------------------------------------------
    # Step 3: Determine the 7-day forecast date range.
    #
    # Predictions start from tomorrow (today + 1 day) and run for 7 days.
    # -------------------------------------------------------------------------
    today: date = date.today()
    forecast_dates: List[str] = [
        (today + timedelta(days=offset)).isoformat() for offset in range(1, 8)
    ]
    day1: str = forecast_dates[0]
    day7: str = forecast_dates[-1]

    # -------------------------------------------------------------------------
    # Step 4: Compose the user prompt by injecting the historical data and
    # date range into the template.
    #
    # user_prompt is then passed directly to generate_content_async().
    # The system framing in _SYSTEM_INSTRUCTION is supplied separately via
    # the system_instruction parameter of GenerativeModel so that Gemini
    # keeps the role context isolated from the per-call data.
    # -------------------------------------------------------------------------
    user_prompt: str = _USER_PROMPT_TEMPLATE.format(
        commodity_id=commodity_id,
        region_id=region_id,
        price_history_block=price_history_block,
        n_points=n_points,
        context_window=_CONTEXT_WINDOW,
        day1=day1,
        day7=day7,
    )

    # -------------------------------------------------------------------------
    # Step 5: Call Gemini 2.0 Flash with JSON Mode active.
    #
    # The model is initialised with:
    #   system_instruction  – role framing and hard output rules.
    #   generation_config   – response_mime_type="application/json" enforces
    #                         valid JSON at the sampling level. This is an API
    #                         guarantee, not merely a prompt instruction.
    # -------------------------------------------------------------------------
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=_SYSTEM_INSTRUCTION,
            generation_config=_JSON_GENERATION_CONFIG,
        )
        response = await model.generate_content_async(user_prompt)

    except Exception as exc:
        logger.error(
            "Gemini API call failed for commodity %d, region %d: %s",
            commodity_id,
            region_id,
            exc,
        )
        return []

    # -------------------------------------------------------------------------
    # Step 6: Parse the JSON-Mode response.
    #
    # Because response_mime_type="application/json" is set, response.text is
    # guaranteed to be valid JSON by the Gemini API contract. We still wrap
    # json.loads() in a try/except as a defensive measure against edge cases
    # in older SDK versions or unexpected API changes.
    # -------------------------------------------------------------------------
    if not response.text:
        logger.warning(
            "Gemini returned an empty response for commodity %d, region %d.",
            commodity_id,
            region_id,
        )
        return []

    try:
        raw: list = json.loads(response.text)
    except json.JSONDecodeError as exc:
        logger.error(
            "Unexpected JSON decode failure for commodity %d, region %d. "
            "Raw response (first 500 chars): %.500s | Error: %s",
            commodity_id,
            region_id,
            response.text,
            exc,
        )
        return []

    # -------------------------------------------------------------------------
    # Step 7: Validate and coerce each prediction row.
    #
    # We iterate over every item returned by the model, attempt to extract
    # "date" and "price", and skip any malformed entry rather than failing
    # the entire forecast. A warning is logged if the final count is not 7.
    # -------------------------------------------------------------------------
    results: List[PredictionResult] = []

    for idx, item in enumerate(raw):
        try:
            target_date: str = str(item["date"])
            predicted_price: float = float(item["price"])

            if predicted_price <= 0:
                logger.warning(
                    "Commodity %d: Gemini returned non-positive price %.2f "
                    "for date %s – skipping this point.",
                    commodity_id,
                    predicted_price,
                    target_date,
                )
                continue

            results.append(
                PredictionResult(
                    commodity_id=commodity_id,
                    region_id=region_id,
                    target_date=target_date,
                    predicted_price=round(predicted_price, 2),
                )
            )

        except (KeyError, TypeError, ValueError) as exc:
            logger.error(
                "Commodity %d: could not parse prediction item [%d] = %r: %s",
                commodity_id,
                idx,
                item,
                exc,
            )
            continue

    if len(results) != 7:
        logger.warning(
            "Commodity %d, region %d: expected 7 prediction points, "
            "got %d after validation.",
            commodity_id,
            region_id,
            len(results),
        )

    logger.info(
        "Gemini prediction complete: commodity=%d region=%d "
        "points_returned=%d context_used=%d valid_history=%d",
        commodity_id,
        region_id,
        len(results),
        n_points,
        len(valid_prices),
    )

    return results
