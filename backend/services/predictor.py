"""
PyTorch price prediction service.
Uses a Transformer-based architecture for 7-day commodity price forecasting.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, List

import numpy as np
import pandas as pd
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


# ── Model Architecture ──────────────────────────────────────────────────────
class PriceTransformer(nn.Module):
    """
    Lightweight Transformer encoder for time-series price prediction.

    Architecture:
        Input → Linear projection → Positional Encoding
        → TransformerEncoder (N layers) → Linear head → 7-day forecast

    Why Transformer over LSTM:
        - Captures long-range dependencies via self-attention.
        - Parallelizable training (no sequential bottleneck).
        - More stable gradient flow for longer sequences.
    """

    def __init__(
        self,
        input_dim: int = 1,
        d_model: int = 64,
        nhead: int = 4,
        num_layers: int = 2,
        dim_feedforward: int = 128,
        forecast_horizon: int = 7,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.d_model = d_model
        self.forecast_horizon = forecast_horizon

        # Project raw price to model dimension
        self.input_projection = nn.Linear(input_dim, d_model)

        # Learnable positional encoding
        self.pos_encoding = nn.Parameter(torch.randn(1, 512, d_model) * 0.02)

        # Transformer encoder stack
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer, num_layers=num_layers
        )

        # Prediction head: last hidden state → 7-day forecast
        self.fc_out = nn.Sequential(
            nn.Linear(d_model, dim_feedforward),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(dim_feedforward, forecast_horizon),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, 1) – historical price sequence.
        Returns:
            (batch, 7) – predicted prices for next 7 days.
        """
        seq_len = x.size(1)

        # Project and add positional encoding
        x = self.input_projection(x)
        x = x + self.pos_encoding[:, :seq_len, :]

        # Transformer encoding
        x = self.transformer(x)

        # Use the last time-step's representation for prediction
        x = x[:, -1, :]  # (batch, d_model)

        return self.fc_out(x)  # (batch, 7)


# ── Prediction Result ────────────────────────────────────────────────────────
@dataclass
class PredictionResult:
    """A single prediction data point ready for DB insertion."""

    commodity_id: int
    region_id: int
    target_date: str       # ISO format YYYY-MM-DD
    predicted_price: float


# ── Global Model Cache ──────────────────────────────────────────────────────
_model_cache: Dict[int, PriceTransformer] = {}
MODEL_WEIGHTS_DIR = "models/"  # Directory for saved .pt files


def _load_model(commodity_id: int) -> PriceTransformer:
    """Load or retrieve cached model for a given commodity."""
    if commodity_id not in _model_cache:
        model = PriceTransformer()
        weights_path = f"{MODEL_WEIGHTS_DIR}commodity_{commodity_id}.pt"

        try:
            state_dict = torch.load(weights_path, map_location="cpu", weights_only=True)
            model.load_state_dict(state_dict)
            logger.info("Loaded model weights for commodity %d", commodity_id)
        except FileNotFoundError:
            logger.warning(
                "No trained weights found at %s – using random initialization. "
                "Predictions will be unreliable until the model is trained.",
                weights_path,
            )

        model.eval()
        _model_cache[commodity_id] = model

    return _model_cache[commodity_id]


def _prepare_input(
    historical_prices: List[float], lookback: int = 30
) -> torch.Tensor:
    """
    Prepare historical prices into a model-ready tensor.

    Steps:
        1. Take last `lookback` data points.
        2. Normalize using z-score (mean/std).
        3. Reshape to (1, seq_len, 1).
    """
    prices = np.array(historical_prices[-lookback:], dtype=np.float32)

    # Z-score normalization
    mean = prices.mean()
    std = prices.std() + 1e-8  # avoid division by zero
    normalized = (prices - mean) / std

    tensor = torch.tensor(normalized, dtype=torch.float32)
    return tensor.unsqueeze(0).unsqueeze(-1)  # (1, seq_len, 1), mean, std


def run_pytorch_inference(
    commodity_id: int,
    region_id: int,
    historical_prices: List[float],
) -> List[PredictionResult]:
    """
    Run 7-day price prediction for a single commodity.

    Args:
        commodity_id:       Database ID of the commodity.
        region_id:          Database ID of the region.
        historical_prices:  List of recent actual prices (at least 30 days).

    Returns:
        List of 7 PredictionResult objects, one per forecast day.
    """
    if len(historical_prices) < 7:
        logger.warning(
            "Insufficient data for commodity %d (%d points). Skipping.",
            commodity_id,
            len(historical_prices),
        )
        return []

    model = _load_model(commodity_id)
    input_tensor = _prepare_input(historical_prices)

    # Denormalization parameters
    prices_np = np.array(historical_prices[-30:], dtype=np.float32)
    mean_price = float(prices_np.mean())
    std_price = float(prices_np.std()) + 1e-8

    with torch.no_grad():
        raw_predictions = model(input_tensor)  # (1, 7)

    # Denormalize predictions back to actual price scale
    predictions = raw_predictions.squeeze(0).numpy()
    denormalized = predictions * std_price + mean_price

    # Build result list
    today = date.today()
    results: List[PredictionResult] = []

    for day_offset in range(1, 8):
        forecast_date = today + timedelta(days=day_offset)
        results.append(
            PredictionResult(
                commodity_id=commodity_id,
                region_id=region_id,
                target_date=forecast_date.isoformat(),
                predicted_price=round(float(denormalized[day_offset - 1]), 2),
            )
        )

    logger.info(
        "Generated 7-day forecast for commodity %d, region %d",
        commodity_id,
        region_id,
    )
    return results
