"""
Price scraper service.
Scrapes daily commodity prices from SIHAP DIY
(Sistem Informasi Harga dan Produksi Komoditi Pertanian Daerah Istimewa Yogyakarta).

Source URL : https://hargapangan.jogjaprov.go.id/tabel-harga
Maintainer : Adjust ``commodity_map`` and CSS selectors whenever the SIHAP DIY
             page structure changes.  The selectors below are placeholders –
             inspect the live DOM and update them accordingly.

STRICT DATA INTEGRITY POLICY
─────────────────────────────
• If the target page cannot be reached (network error, non-200 status,
  timeout) every commodity for that target is recorded with
  ``actual_price = None``.
• If a specific price element is missing or cannot be parsed, that
  commodity is recorded with ``actual_price = None``.
• DILARANG KERAS menggunakan forward-fill data.
  Biarkan None jika scraping gagal / data belum rilis.
  Consumers of this data (e.g. the cron router and the Gemini predictor)
  must handle None explicitly – they must NOT infer or carry-forward the
  previous day's price as a substitute.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


# ── Target Configuration ──────────────────────────────────────────────────────


@dataclass(frozen=True)
class ScrapeTarget:
    """
    Describes a single data source to scrape.

    Attributes:
        name:          Human-readable name used in log messages.
        url:           Full URL of the page to GET.
        commodity_map: Mapping of CSS-selector-key → commodity_id.
                       The key is used to build a ``select_one`` query
                       that locates the price element in the HTML.
                       Adjust to match the real SIHAP DIY DOM structure.
    """

    name: str
    url: str
    commodity_map: Dict[str, int] = field(default_factory=dict)


# Single source: SIHAP DIY (Jogja Province commodity price information system).
# Selector keys are placeholders – update to real attribute values or CSS
# selectors after inspecting the live page at the URL above.
SCRAPE_TARGETS: List[ScrapeTarget] = [
    ScrapeTarget(
        name="SIHAP DIY",
        url="https://hargapangan.jogjaprov.go.id/tabel-harga",
        commodity_map={
            # selector_key → commodity_id in the `commodities` DB table
            # Example expected selector usage:
            #   soup.select_one("[data-commodity='beras_medium']")
            # Update these keys once the real DOM has been inspected.
            "beras_medium": 1,
            "cabai_merah": 2,
            "bawang_merah": 3,
        },
    ),
]


# ── Data Model ────────────────────────────────────────────────────────────────


@dataclass
class ScrapedPrice:
    """
    A single price data point ready for database insertion.

    ``actual_price`` is ``None`` when the page was unreachable, the target
    element was absent, or the raw text could not be parsed as a number.
    Downstream code MUST treat ``None`` as "data unavailable for this date"
    and must NOT substitute it with a previously scraped value (no
    forward-fill).
    """

    commodity_id: int
    region_id: int
    date: str  # ISO-8601: YYYY-MM-DD
    actual_price: Optional[float] = None


# ── Public API ────────────────────────────────────────────────────────────────


def run_scraper(region_id: int = 1) -> List[ScrapedPrice]:
    """
    Scrape today's commodity prices from SIHAP DIY.

    For each commodity defined in ``SCRAPE_TARGETS[*].commodity_map`` a
    ``ScrapedPrice`` row is **always** appended to the return list.
    ``actual_price`` is ``None`` when data cannot be obtained – the entry is
    still included so callers can distinguish "tried but unavailable" from
    "commodity not configured".

    Returns:
        List of ``ScrapedPrice`` instances (one per commodity per target).
        The list is never empty as long as ``SCRAPE_TARGETS`` is non-empty.
    """
    results: List[ScrapedPrice] = []
    today = date.today().isoformat()

    for target in SCRAPE_TARGETS:
        # Snapshot the commodity list before attempting the HTTP request so
        # we can always emit one result row per commodity regardless of
        # whether the fetch succeeds or fails.
        commodity_entries: List[Tuple[str, int]] = list(target.commodity_map.items())

        soup: Optional[BeautifulSoup] = _fetch_page(target)

        # ── Iterate ALL commodities – never skip with continue ─────────────
        # DILARANG KERAS menggunakan forward-fill data.
        # Biarkan None jika scraping gagal / data belum rilis.
        for selector_key, commodity_id in commodity_entries:
            actual_price: Optional[float] = None

            if soup is not None:
                actual_price = _extract_price(soup, selector_key, target.name)

            # Always append – even when actual_price is None.
            results.append(
                ScrapedPrice(
                    commodity_id=commodity_id,
                    region_id=region_id,
                    date=today,
                    actual_price=actual_price,
                )
            )

    # ── Summary log ──────────────────────────────────────────────────────────
    total = len(results)
    success = sum(1 for r in results if r.actual_price is not None)
    logger.info(
        "Scraper complete: %d/%d prices successfully parsed "
        "(%d recorded as None – no forward-fill applied).",
        success,
        total,
        total - success,
    )

    return results


# ── Private helpers ───────────────────────────────────────────────────────────


def _fetch_page(target: ScrapeTarget) -> Optional[BeautifulSoup]:
    """
    Perform an HTTP GET for ``target.url`` and return a parsed
    ``BeautifulSoup`` object, or ``None`` if the request fails.

    A ``None`` return signals callers to record all commodities for this
    target as ``actual_price = None`` without raising an exception.

    Args:
        target: The :class:`ScrapeTarget` to fetch.

    Returns:
        Parsed HTML as ``BeautifulSoup``, or ``None`` on any failure.
    """
    try:
        logger.info("Fetching %s → %s", target.name, target.url)
        response = requests.get(target.url, timeout=30)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    except requests.exceptions.Timeout:
        logger.error(
            "Request to %s timed out. "
            "All commodities will be recorded with actual_price=None.",
            target.name,
        )
        return None

    except requests.exceptions.HTTPError as exc:
        logger.error(
            "HTTP error fetching %s (status %s). "
            "All commodities will be recorded with actual_price=None.",
            target.name,
            exc.response.status_code if exc.response is not None else "unknown",
        )
        return None

    except requests.exceptions.RequestException as exc:
        logger.error(
            "Network error fetching %s: %s. "
            "All commodities will be recorded with actual_price=None.",
            target.name,
            exc,
        )
        return None


def _extract_price(
    soup: BeautifulSoup,
    selector_key: str,
    source_name: str,
) -> Optional[float]:
    """
    Locate a price element in the parsed HTML and return its numeric value.

    Selector convention (update to match real SIHAP DIY DOM):
        ``soup.select_one(f"[data-commodity='{selector_key}']")``

    The raw text is normalised by stripping "Rp", thousand-separator dots,
    and converting decimal commas to periods before casting to ``float``.

    Args:
        soup:         Parsed page HTML.
        selector_key: Key from ``ScrapeTarget.commodity_map``.
        source_name:  Name of the source for log context.

    Returns:
        Parsed price as ``float``, or ``None`` if the element is absent or
        the text cannot be converted.  Callers must NOT forward-fill a
        ``None`` return value.
    """
    # ── Locate element ────────────────────────────────────────────────────
    # TODO: Replace this selector with the real CSS selector / XPath
    #       observed in the live SIHAP DIY HTML after inspecting the page.
    price_element = soup.select_one(f"[data-commodity='{selector_key}']")

    if price_element is None:
        logger.warning(
            "Element for commodity '%s' not found on %s. "
            "Price recorded as None – no forward-fill applied.",
            selector_key,
            source_name,
        )
        # Do NOT return a previously known value. Return None explicitly.
        return None

    # ── Parse raw text ────────────────────────────────────────────────────
    raw_text = price_element.get_text(strip=True)

    try:
        # Normalise Indonesian price format: "Rp 12.500,00" → 12500.0
        cleaned = (
            raw_text.replace("Rp", "")
            .replace("\xa0", "")  # non-breaking space
            .replace(".", "")  # thousand separators
            .replace(",", ".")  # decimal separator
            .strip()
        )
        parsed = float(cleaned)
        logger.debug(
            "Parsed price for '%s' from %s: %s → %.2f",
            selector_key,
            source_name,
            raw_text,
            parsed,
        )
        return parsed

    except (ValueError, TypeError) as exc:
        logger.error(
            "Could not parse price text '%s' for commodity '%s' on %s: %s. "
            "Price recorded as None – no forward-fill applied.",
            raw_text,
            selector_key,
            source_name,
            exc,
        )
        # DILARANG KERAS menggunakan forward-fill data.
        # Biarkan None jika scraping gagal / data belum rilis.
        return None
