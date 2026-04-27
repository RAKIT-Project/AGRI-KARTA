"""
Cron Job Router.
Handles scheduled tasks triggered by Supabase pg_cron or external schedulers.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any, Dict, List

from fastapi import APIRouter, Header, HTTPException, status

from config import get_settings
from services.gemini_prompter import generate_daily_digest
from services.predictor import run_pytorch_inference
from services.scraper import run_scraper
from services.supabase_client import get_supabase_client
from services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cron", tags=["Cron Jobs"])


# ═════════════════════════════════════════════════════════════════════════════
# POST /api/cron/daily-digest — Daily Workflow
# ═════════════════════════════════════════════════════════════════════════════
@router.post(
    "/daily-digest",
    summary="Execute daily digest pipeline",
    response_model=Dict[str, Any],
)
async def daily_digest(
    authorization: str = Header(..., description="Bearer <CRON_SECRET>"),
) -> Dict[str, Any]:
    """
    Full daily pipeline triggered by Supabase pg_cron every morning.

    Secured via Bearer token in the Authorization header.

    Workflow:
        a. Scrape latest commodity prices.
        b. Save scraped prices to `daily_prices` table.
        c. Run PyTorch Transformer inference → 7-day price predictions.
        d. Save predictions to `price_predictions` table.
        e. Fetch users with active alerts + is_wa_verified = True.
        f. Generate personalized daily digest via Gemini for each user.
        g. Send digest messages via WhatsApp API.
    """

    # ── Auth Guard ──────────────────────────────────────────────────────
    _verify_cron_token(authorization)

    supabase = get_supabase_client()
    report: Dict[str, Any] = {
        "prices_scraped": 0,
        "predictions_generated": 0,
        "users_notified": 0,
        "errors": [],
    }

    # ════════════════════════════════════════════════════════════════════
    # STEP A: Scrape latest commodity prices
    # ════════════════════════════════════════════════════════════════════
    logger.info("▶ Step A: Running price scraper...")
    scraped_prices = run_scraper()
    report["prices_scraped"] = len(scraped_prices)

    if not scraped_prices:
        logger.warning("No prices scraped – pipeline will continue with stale data")

    # ════════════════════════════════════════════════════════════════════
    # STEP B: Save scraped prices to `daily_prices`
    # ════════════════════════════════════════════════════════════════════
    logger.info("▶ Step B: Saving %d prices to database...", len(scraped_prices))
    if scraped_prices:
        try:
            rows = [asdict(p) for p in scraped_prices]
            supabase.table("daily_prices").upsert(
                rows, on_conflict="commodity_id,region_id,date"
            ).execute()
        except Exception as exc:
            error_msg = f"Failed to save prices: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    # ════════════════════════════════════════════════════════════════════
    # STEP C: Run PyTorch inference for each commodity
    # ════════════════════════════════════════════════════════════════════
    logger.info("▶ Step C: Running PyTorch prediction models...")
    all_predictions = []

    # Get distinct commodity/region pairs from today's scrape
    commodity_regions = {(p.commodity_id, p.region_id) for p in scraped_prices}

    for commodity_id, region_id in commodity_regions:
        try:
            # Fetch last 60 days of historical data for this commodity
            history = (
                supabase.table("daily_prices")
                .select("actual_price")
                .eq("commodity_id", commodity_id)
                .eq("region_id", region_id)
                .order("date", desc=True)
                .limit(60)
                .execute()
            )

            historical_prices = [
                row["actual_price"]
                for row in reversed(history.data)
                if row["actual_price"] is not None
            ]

            predictions = run_pytorch_inference(
                commodity_id=commodity_id,
                region_id=region_id,
                historical_prices=historical_prices,
            )
            all_predictions.extend(predictions)

        except Exception as exc:
            error_msg = f"Prediction failed for commodity {commodity_id}: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    report["predictions_generated"] = len(all_predictions)

    # ════════════════════════════════════════════════════════════════════
    # STEP D: Save predictions to `price_predictions`
    # ════════════════════════════════════════════════════════════════════
    logger.info("▶ Step D: Saving %d predictions to database...", len(all_predictions))
    if all_predictions:
        try:
            rows = [asdict(p) for p in all_predictions]
            supabase.table("price_predictions").upsert(
                rows, on_conflict="commodity_id,region_id,target_date"
            ).execute()
        except Exception as exc:
            error_msg = f"Failed to save predictions: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    # ════════════════════════════════════════════════════════════════════
    # STEP E: Fetch verified users with active price alerts
    # ════════════════════════════════════════════════════════════════════
    logger.info("▶ Step E: Fetching verified users with active alerts...")
    try:
        users_result = (
            supabase.table("users")
            .select(
                "id, full_name, phone_number, "
                "price_alerts!inner(id, commodity_id, threshold_price, alert_type, is_active)"
            )
            .eq("is_wa_verified", True)
            .eq("price_alerts.is_active", True)
            .execute()
        )
        eligible_users = users_result.data or []

    except Exception as exc:
        error_msg = f"Failed to fetch users: {exc}"
        logger.error(error_msg)
        report["errors"].append(error_msg)
        eligible_users = []

    logger.info("Found %d eligible users for notifications", len(eligible_users))

    # ════════════════════════════════════════════════════════════════════
    # STEP F & G: Generate Gemini digest + Send via WhatsApp
    # ════════════════════════════════════════════════════════════════════
    logger.info("▶ Steps F-G: Generating & sending daily digests...")

    # Pre-format shared data for Gemini prompts
    prices_for_prompt = _format_prices_for_prompt(scraped_prices)
    predictions_for_prompt = _format_predictions_for_prompt(all_predictions)

    for user in eligible_users:
        try:
            user_name = user.get("full_name") or "Pengguna"
            phone = user.get("phone_number")

            if not phone:
                continue

            # Format user-specific alerts
            user_alerts = [
                {
                    "commodity_name": f"Commodity #{a['commodity_id']}",
                    "threshold_price": a["threshold_price"],
                    "alert_type": a["alert_type"],
                }
                for a in user.get("price_alerts", [])
            ]

            # ── Step F: Generate personalized message via Gemini ────
            digest_text = await generate_daily_digest(
                user_name=user_name,
                scraped_prices=prices_for_prompt,
                predictions=predictions_for_prompt,
                user_alerts=user_alerts,
            )

            # ── Step G: Send via WhatsApp API ──────────────────────
            sent = await send_whatsapp_message(phone, digest_text)
            if sent:
                report["users_notified"] += 1

        except Exception as exc:
            error_msg = f"Failed to notify user {user.get('id')}: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    logger.info(
        "✅ Daily digest complete – %d scraped, %d predicted, %d notified, %d errors",
        report["prices_scraped"],
        report["predictions_generated"],
        report["users_notified"],
        len(report["errors"]),
    )

    return report


# ── Helpers ──────────────────────────────────────────────────────────────────
def _verify_cron_token(authorization: str) -> None:
    """Validate the cron secret from the Authorization header."""
    settings = get_settings()
    expected = f"Bearer {settings.cron_secret}"

    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron authorization token",
        )


def _format_prices_for_prompt(scraped_prices: list) -> List[Dict[str, Any]]:
    """Convert ScrapedPrice objects to dicts for the Gemini prompt."""
    return [
        {
            "commodity_name": f"Commodity #{p.commodity_id}",
            "actual_price": p.actual_price,
            "unit": "kg",
        }
        for p in scraped_prices
    ]


def _format_predictions_for_prompt(predictions: list) -> List[Dict[str, Any]]:
    """Convert PredictionResult objects to dicts for the Gemini prompt."""
    return [
        {
            "commodity_name": f"Commodity #{p.commodity_id}",
            "predicted_price": p.predicted_price,
            "date": p.target_date,
        }
        for p in predictions
    ]
