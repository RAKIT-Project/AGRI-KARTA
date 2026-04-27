"""
Price scraper service.
Scrapes daily commodity prices from public Indonesian market data sources.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from typing import List

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Target URLs ─────────────────────────────────────────────────────────────
# Replace with actual Indonesian commodity price data sources.
# Examples: PIHPS (Panel Informasi Harga Pangan Strategis),
#           BPS, or regional Dinas Pertanian portals.
SCRAPE_TARGETS = [
    {
        "name": "PIHPS Nasional",
        "url": "https://www.bi.go.id/hargapangan/TabelHarga/PasarTradisionalTabel",
        "commodity_map": {
            # CSS selector → commodity_id mapping (adjust to real DOM)
            "beras_medium": 1,
            "cabai_merah": 2,
            "bawang_merah": 3,
        },
    },
]


@dataclass
class ScrapedPrice:
    """A single scraped price data point."""

    commodity_id: int
    region_id: int
    date: str          # ISO format YYYY-MM-DD
    actual_price: float


def run_scraper(region_id: int = 1) -> List[ScrapedPrice]:
    """
    Scrape today's commodity prices and return structured data.

    Returns:
        List of ScrapedPrice dataclass instances ready for DB insertion.

    Implementation Notes:
        1. Send HTTP GET to each target URL.
        2. Parse HTML with BeautifulSoup.
        3. Extract price cells using the commodity_map selectors.
        4. Normalize prices (strip "Rp", dots, commas → float).
        5. Return a list of ScrapedPrice objects.
    """
    results: List[ScrapedPrice] = []
    today = date.today().isoformat()

    for target in SCRAPE_TARGETS:
        try:
            logger.info("Scraping %s → %s", target["name"], target["url"])
            response = requests.get(target["url"], timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # ── Extraction Logic (customize per source) ──────────────
            # This is a skeleton – real selectors depend on the source HTML.
            for selector_key, commodity_id in target["commodity_map"].items():
                price_element = soup.select_one(f"[data-commodity='{selector_key}']")

                if price_element is None:
                    logger.warning(
                        "Commodity %s not found on %s", selector_key, target["name"]
                    )
                    continue

                raw_price = price_element.get_text(strip=True)
                # Normalize: "Rp 12.500" → 12500.0
                cleaned = (
                    raw_price.replace("Rp", "")
                    .replace(".", "")
                    .replace(",", ".")
                    .strip()
                )
                actual_price = float(cleaned)

                results.append(
                    ScrapedPrice(
                        commodity_id=commodity_id,
                        region_id=region_id,
                        date=today,
                        actual_price=actual_price,
                    )
                )

            logger.info(
                "Scraped %d prices from %s", len(results), target["name"]
            )

        except requests.RequestException as exc:
            logger.error("Failed to scrape %s: %s", target["name"], exc)
        except (ValueError, AttributeError) as exc:
            logger.error("Parse error on %s: %s", target["name"], exc)

    return results
