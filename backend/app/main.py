import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.core.config import get_settings
from app.models.database import create_tables, SessionLocal
from app.models import client, receipt, daily_payment, system_settings  # noqa: F401 – register models
from app.api import webhook, receipts, clients, reports, settings as settings_api
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DarkCred ZAP Analyst starting…")
    create_tables()
    start_scheduler(SessionLocal)
    yield
    stop_scheduler()
    logger.info("DarkCred ZAP Analyst stopped.")


app = FastAPI(
    title="DarkCred ZAP Analyst",
    description="Sistema de verificação de comprovantes por IA — DarkCred",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(webhook.router)
app.include_router(receipts.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")

# Serve uploaded images
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": "DarkCred ZAP Analyst"}
