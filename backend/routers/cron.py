"""
Cron Job Router.
Handles scheduled tasks triggered by Supabase pg_cron or external schedulers.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any, Dict, List

from config import get_settings
from fastapi import APIRouter, Header, HTTPException, status
from services.gemini_predictor import PredictionResult, run_gemini_prediction
from services.gemini_prompter import generate_daily_digest
from services.scraper import run_scraper
from services.supabase_client import get_supabase_client
from services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cron", tags=["Cron Jobs"])


# =============================================================================
# POST /api/cron/daily-digest — Daily Workflow
# =============================================================================


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
        a. Scrape latest commodity prices from SIHAP DIY.
        b. Save only non-None scraped prices to the daily_prices table.
           Rows where actual_price is None are NOT persisted.
           There is no forward-fill substitution.
        c. Run Gemini 2.0 Flash (JSON Mode) inference for a 7-day price
           forecast, using the last 30 days of historical data as trend
           context. None slots in the history are filtered out before
           being passed to the model (no forward-fill).
        d. Save predictions to the price_predictions table.
        e. Fetch users with active alerts and is_wa_verified = True.
        f. Generate a personalized daily digest via Gemini for each user.
        g. Send digest messages via the Wablas WhatsApp API.
           Suppressed silently when WABLAS_DRY_RUN=true.
    """

    # ── Auth Guard ────────────────────────────────────────────────────────────
    _verify_cron_token(authorization)

    supabase = get_supabase_client()

    report: Dict[str, Any] = {
        "prices_scraped": 0,
        "prices_skipped_none": 0,
        "predictions_generated": 0,
        "users_notified": 0,
        "errors": [],
    }

    # =========================================================================
    # STEP A: Scrape latest commodity prices from SIHAP DIY
    # =========================================================================
    logger.info("Step A: Running SIHAP DIY price scraper...")

    scraped_prices = run_scraper()

    prices_with_data = [p for p in scraped_prices if p.actual_price is not None]
    prices_none = [p for p in scraped_prices if p.actual_price is None]

    report["prices_scraped"] = len(prices_with_data)
    report["prices_skipped_none"] = len(prices_none)

    if not prices_with_data:
        logger.warning(
            "No valid prices scraped today. %d entries recorded as None. "
            "Prediction and notification steps will use historical data only.",
            len(prices_none),
        )

    # =========================================================================
    # STEP B: Save non-None scraped prices to the daily_prices table
    #
    # Only rows with a non-None actual_price are persisted.
    # Rows where actual_price is None indicate the scraper found no data for
    # that commodity today and are excluded from the upsert.
    # DILARANG KERAS menggunakan forward-fill data.
    # =========================================================================
    logger.info(
        "Step B: Saving %d valid prices to database "
        "(%d None entries excluded, no forward-fill)...",
        len(prices_with_data),
        len(prices_none),
    )

    if prices_with_data:
        try:
            rows = [asdict(p) for p in prices_with_data]
            supabase.table("daily_prices").upsert(
                rows, on_conflict="commodity_id,region_id,date"
            ).execute()
            logger.info("Step B: %d price rows upserted successfully.", len(rows))
        except Exception as exc:
            error_msg = f"Step B failed – could not save scraped prices: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    # =========================================================================
    # STEP C: Run Gemini 2.0 Flash (JSON Mode) inference for each commodity
    #
    # commodity_regions is derived from the full scraped_prices list (including
    # None entries) so that predictions are attempted for every configured
    # commodity even on days when the scrape returned no data.
    #
    # Historical prices are fetched from the DB with a null filter applied at
    # query time. The Gemini predictor also filters any remaining None values
    # internally before building the prompt context.
    # =========================================================================
    logger.info("Step C: Running Gemini 2.0 Flash price predictions (JSON Mode)...")

    all_predictions: List[PredictionResult] = []

    commodity_regions = {(p.commodity_id, p.region_id) for p in scraped_prices}

    for commodity_id, region_id in commodity_regions:
        try:
            # Fetch the last 60 non-null rows from the DB so the predictor
            # has enough context after its own internal None filter.
            history = (
                supabase.table("daily_prices")
                .select("actual_price")
                .eq("commodity_id", commodity_id)
                .eq("region_id", region_id)
                .not_.is_("actual_price", "null")
                .order("date", desc=True)
                .limit(60)
                .execute()
            )

            # Reverse the list so prices are ordered oldest to newest.
            historical_prices = [
                float(row["actual_price"])
                for row in reversed(history.data)
                if row["actual_price"] is not None
            ]

            logger.info(
                "Step C: commodity=%d region=%d history_points=%d",
                commodity_id,
                region_id,
                len(historical_prices),
            )

            predictions = await run_gemini_prediction(
                commodity_id=commodity_id,
                region_id=region_id,
                historical_prices=historical_prices,
            )

            all_predictions.extend(predictions)

        except Exception as exc:
            error_msg = (
                f"Step C failed – Gemini prediction error for "
                f"commodity {commodity_id}, region {region_id}: {exc}"
            )
            logger.error(error_msg)
            report["errors"].append(error_msg)

    report["predictions_generated"] = len(all_predictions)
    logger.info("Step C: %d total predictions generated.", len(all_predictions))

    # =========================================================================
    # STEP D: Save predictions to the price_predictions table
    # =========================================================================
    logger.info("Step D: Saving %d predictions to database...", len(all_predictions))

    if all_predictions:
        try:
            rows = [asdict(p) for p in all_predictions]
            supabase.table("price_predictions").upsert(
                rows, on_conflict="commodity_id,region_id,target_date"
            ).execute()
            logger.info("Step D: %d prediction rows upserted successfully.", len(rows))
        except Exception as exc:
            error_msg = f"Step D failed – could not save predictions: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    # =========================================================================
    # STEP E: Fetch verified users with active price alerts
    # =========================================================================
    logger.info("Step E: Fetching verified users with active alerts...")

    eligible_users: List[Dict[str, Any]] = []

    try:
        users_result = (
            supabase.table("users")
            .select(
                "id, full_name, phone_number, "
                "price_alerts!inner("
                "id, commodity_id, threshold_price, alert_type, is_active"
                ")"
            )
            .eq("is_wa_verified", True)
            .eq("price_alerts.is_active", True)
            .execute()
        )
        eligible_users = users_result.data or []
        logger.info("Step E: %d eligible users found.", len(eligible_users))
    except Exception as exc:
        error_msg = f"Step E failed – could not fetch eligible users: {exc}"
        logger.error(error_msg)
        report["errors"].append(error_msg)

    # =========================================================================
    # STEP F & G: Generate Gemini digest + Send via Wablas WhatsApp API
    #
    # The Wablas send call is a no-op when WABLAS_DRY_RUN=true.
    # =========================================================================
    logger.info("Steps F-G: Generating and sending daily digests via Wablas...")

    prices_for_prompt = _format_prices_for_prompt(prices_with_data)
    predictions_for_prompt = _format_predictions_for_prompt(all_predictions)

    for user in eligible_users:
        try:
            user_name: str = user.get("full_name") or "Pengguna"
            phone: str = user.get("phone_number", "")

            if not phone:
                logger.warning(
                    "User %s has no phone_number – skipping.", user.get("id")
                )
                continue

            user_alerts = [
                {
                    "commodity_name": f"Commodity #{a['commodity_id']}",
                    "threshold_price": a["threshold_price"],
                    "alert_type": a["alert_type"],
                }
                for a in user.get("price_alerts", [])
            ]

            # Step F: Generate personalized digest text via Gemini.
            digest_text = await generate_daily_digest(
                user_name=user_name,
                scraped_prices=prices_for_prompt,
                predictions=predictions_for_prompt,
                user_alerts=user_alerts,
            )

            # Step G: Deliver the digest via Wablas.
            # When WABLAS_DRY_RUN=true this logs the payload and returns True
            # without making an HTTP request.
            sent = await send_whatsapp_message(phone, digest_text)

            if sent:
                report["users_notified"] += 1
            else:
                logger.warning(
                    "Wablas delivery failed for user %s (%s).",
                    user.get("id"),
                    phone[:6] + "***",
                )

        except Exception as exc:
            error_msg = f"Steps F-G failed for user {user.get('id')}: {exc}"
            logger.error(error_msg)
            report["errors"].append(error_msg)

    # ── Pipeline summary ──────────────────────────────────────────────────────
    logger.info(
        "Daily digest pipeline complete. "
        "scraped=%d skipped_none=%d predicted=%d notified=%d errors=%d",
        report["prices_scraped"],
        report["prices_skipped_none"],
        report["predictions_generated"],
        report["users_notified"],
        len(report["errors"]),
    )

    return report


# =============================================================================
# Helper functions
# =============================================================================


def _verify_cron_token(authorization: str) -> None:
    """
    Validate the cron secret supplied in the Authorization header.

    Raises HTTP 401 if the token does not match CRON_SECRET.
    """
    settings = get_settings()
    expected = f"Bearer {settings.cron_secret}"

    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron authorization token.",
        )


def _format_prices_for_prompt(scraped_prices: list) -> List[Dict[str, Any]]:
    """
    Convert a list of ScrapedPrice objects into plain dicts for the Gemini
    digest prompt. Only entries with a non-None actual_price are included.
    """
    return [
        {
            "commodity_name": f"Commodity #{p.commodity_id}",
            "actual_price": p.actual_price,
            "unit": "kg",
        }
        for p in scraped_prices
        if p.actual_price is not None
    ]


def _format_predictions_for_prompt(predictions: list) -> List[Dict[str, Any]]:
    """
    Convert a list of PredictionResult objects into plain dicts for the
    Gemini digest prompt.
    """
    return [
        {
            "commodity_name": f"Commodity #{p.commodity_id}",
            "predicted_price": p.predicted_price,
            "date": p.target_date,
        }
        for p in predictions
    ]
