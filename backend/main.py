"""
AGRI-KARTA Backend Microservice
================================
Entry point for the FastAPI application.
Handles routing, global error handling, and CORS configuration.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routers import cron, webhook

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("agrikarta")


# ── Lifespan (startup/shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan events for startup and shutdown."""
    # Startup: validate config eagerly
    settings = get_settings()
    logger.info("🚀 AGRI-KARTA backend starting...")
    logger.info("   Supabase URL : %s", settings.supabase_url[:40] + "...")
    logger.info("   Gemini API   : configured ✓")
    logger.info("   WhatsApp API : configured ✓")
    yield
    # Shutdown
    logger.info("👋 AGRI-KARTA backend shutting down...")


# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="AGRI-KARTA Backend",
    description=(
        "Microservice backend for AGRI-KARTA – commodity price intelligence, "
        "prediction, and WhatsApp notification platform for Indonesian agriculture."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",        # Next.js dev
        "https://agri-karta.vercel.app",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handlers ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all exception handler.
    Returns a clean JSON error response instead of an HTML traceback.
    """
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "Internal server error",
            "detail": str(exc) if logger.isEnabledFor(logging.DEBUG) else None,
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
    """Handle ValueError as 422 Unprocessable Entity."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "message": "Validation error",
            "detail": str(exc),
        },
    )


# ── Register Routers ────────────────────────────────────────────────────────
app.include_router(webhook.router)
app.include_router(cron.router)


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Simple health check endpoint for uptime monitoring."""
    return {
        "status": "healthy",
        "service": "agri-karta-backend",
        "version": "1.0.0",
    }
