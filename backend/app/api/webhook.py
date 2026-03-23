import hashlib
import logging
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.database import get_db
from app.models.client import Client
from app.models.receipt import Receipt, ReceiptStatus
from app.services.analyzer import analyze_receipt

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()

REGISTER_TRIGGER = "Comprovante salvo."


@router.post("/webhook/zapi")
async def zapi_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    try:
        body = await request.json()
    except Exception:
        return {"ok": True}

    logger.debug(f"ZAPI webhook: {body}")

    # Normalise: ZAPI sends different shapes depending on event type
    is_from_me = body.get("fromMe", False)
    phone = _extract_phone(body)
    message_type = body.get("type", "")
    text = body.get("text", {})
    if isinstance(text, dict):
        text = text.get("message", "")

    # --- Registration trigger (admin sends "Comprovante salvo." to client) ---
    if is_from_me and isinstance(text, str) and text.strip() == REGISTER_TRIGGER:
        if phone:
            _register_client(phone, db)
        return {"ok": True}

    # --- Admin sends outgoing image → auto-register recipient if not yet saved ---
    if is_from_me and phone:
        image_url = _extract_image_url(body)
        if image_url:
            existing = db.query(Client).filter(Client.phone == phone).first()
            if not existing:
                _register_client(phone, db)
            return {"ok": True}

    # --- Incoming message from a monitored client ---
    if not is_from_me and phone:
        client = db.query(Client).filter(
            Client.phone == phone,
            Client.active == True,
            Client.frozen == False,
        ).first()
        if client:
            image_url = _extract_image_url(body)
            if image_url:
                receipt = Receipt(
                    client_id=client.id,
                    image_url=image_url,
                    received_at=datetime.utcnow(),
                    status=ReceiptStatus.pending,
                )
                db.add(receipt)
                db.commit()
                db.refresh(receipt)

                # Save image locally
                background_tasks.add_task(_save_and_analyze, receipt.id, image_url, db)
                logger.info(f"New receipt #{receipt.id} from client {phone}")

    return {"ok": True}


def _register_client(phone: str, db: Session) -> Client:
    client = db.query(Client).filter(Client.phone == phone).first()
    if client:
        client.active = True
        db.commit()
        logger.info(f"Client {phone} re-activated")
    else:
        client = Client(phone=phone, active=True)
        db.add(client)
        db.commit()
        logger.info(f"Client {phone} registered")
    return client


async def _save_and_analyze(receipt_id: int, image_url: str, db: Session):
    """Download image, save locally, compute hash, check duplicate, then run AI analysis."""
    from app.models.database import SessionLocal
    # Create a fresh DB session for background task
    bg_db = SessionLocal()
    try:
        receipt = bg_db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            return

        img_bytes = None

        # Download and save
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(image_url, follow_redirects=True)
                resp.raise_for_status()
                img_bytes = resp.content
                content_type = resp.headers.get("content-type", "image/jpeg")
                ext = _ext_from_mime(content_type)
                filename = f"{uuid.uuid4()}{ext}"
                save_path = Path(settings.upload_dir) / filename
                save_path.write_bytes(img_bytes)
                receipt.image_path = str(save_path)
                bg_db.commit()
        except Exception as e:
            logger.warning(f"Could not save image locally: {e} — will use URL")

        # Compute SHA-256 hash and check for duplicates
        if img_bytes:
            img_hash = hashlib.sha256(img_bytes).hexdigest()
            receipt.image_hash = img_hash

            dup = bg_db.query(Receipt).filter(
                Receipt.image_hash == img_hash,
                Receipt.id != receipt_id,
            ).first()

            if dup:
                receipt.is_duplicate   = True
                receipt.status         = ReceiptStatus.rejected
                receipt.notes          = f"Comprovante duplicado — hash idêntica ao comprovante #{dup.id}"
                receipt.auto_processed = True
                bg_db.commit()
                logger.warning(f"Receipt #{receipt_id} rejected as duplicate of #{dup.id}")
                return  # skip AI analysis

            bg_db.commit()

        await analyze_receipt(receipt_id, bg_db)
    finally:
        bg_db.close()


def _extract_phone(body: dict) -> str | None:
    """Extract normalized phone (digits only) from various ZAPI payload shapes."""
    for key in ("phone", "chatId", "from", "sender"):
        val = body.get(key, "")
        if isinstance(val, str) and val:
            digits = re.sub(r'\D', '', val.replace("@c.us", ""))
            if len(digits) >= 10:
                return digits
    return None


def _extract_image_url(body: dict) -> str | None:
    """Extract image URL from ZAPI message payload."""
    # image type
    img = body.get("image", {}) or {}
    if isinstance(img, dict):
        url = img.get("imageUrl") or img.get("url")
        if url:
            return url

    # document / media generic
    for key in ("imageUrl", "mediaUrl", "url"):
        val = body.get(key)
        if val and isinstance(val, str):
            return val

    return None


def _ext_from_mime(content_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    mime = content_type.split(";")[0].strip()
    return mapping.get(mime, ".jpg")
