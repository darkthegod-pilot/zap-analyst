import hashlib
import logging
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.database import get_db, SessionLocal
from app.models.client import Client
from app.models.receipt import Receipt, ReceiptStatus
from app.services import zapi as zapi_svc
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
    # ── Verificação de segurança: Client-Token ──────────────────
    from app.api.settings import get_effective_settings
    s = get_effective_settings(db)
    expected_token = s.get("zapi_security_token", "")
    if expected_token:
        incoming_token = request.headers.get("Client-Token", "")
        if incoming_token != expected_token:
            ip = request.client.host if request.client else "unknown"
            logger.warning(f"Webhook rejected: invalid Client-Token from {ip}")
            return {"ok": True}  # 200 silencioso para não revelar o endpoint

    try:
        body = await request.json()
    except Exception:
        return {"ok": True}

    logger.debug(f"ZAPI webhook: {body}")

    # Normalise: ZAPI sends different shapes depending on event type
    is_from_me = body.get("fromMe", False)
    phone = _extract_phone(body)
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
        media = _extract_media_url(body)
        if media:
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
            media = _extract_media_url(body)
            if media:
                receipt = Receipt(
                    client_id=client.id,
                    image_url=media["url"],
                    received_at=datetime.utcnow(),
                    status=ReceiptStatus.pending,
                )
                db.add(receipt)
                db.commit()
                db.refresh(receipt)

                if media["type"] == "pdf":
                    # PDF: save for manual review, no AI
                    receipt.notes = "PDF recebido — revisão manual necessária"
                    db.commit()
                    logger.info(f"New PDF receipt #{receipt.id} from client {phone} — manual review")
                else:
                    # Image: run AI analysis
                    background_tasks.add_task(_save_and_analyze, receipt.id, media["url"])
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


async def _save_and_analyze(receipt_id: int, image_url: str):
    """Download image with ZAPI auth, save locally, check duplicate, run AI analysis."""
    from app.api.settings import get_effective_settings
    bg_db = SessionLocal()
    try:
        receipt = bg_db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            return

        # Load effective settings (includes DB-configured credentials)
        s = get_effective_settings(bg_db)

        # Download image using ZAPI auth headers
        img_bytes = await zapi_svc.download_image(image_url, effective=s)

        if img_bytes:
            # Save locally
            try:
                ext = ".jpg"
                filename = f"{uuid.uuid4()}{ext}"
                save_path = Path(settings.upload_dir) / filename
                save_path.write_bytes(img_bytes)
                receipt.image_path = str(save_path)
                bg_db.commit()
            except Exception as e:
                logger.warning(f"Could not save image locally: {e}")

            # Compute SHA-256 hash and check for duplicates
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
        else:
            logger.warning(f"Receipt #{receipt_id}: image download failed, will attempt via URL in analyzer")

        await analyze_receipt(receipt_id, bg_db)
    except Exception as e:
        logger.error(f"Error in _save_and_analyze for receipt #{receipt_id}: {e}")
        try:
            bg_db.rollback()
        except Exception:
            pass
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


def _extract_media_url(body: dict) -> dict | None:
    """Extract media URL from ZAPI message payload.

    Returns {"url": str, "type": "image"|"pdf"} or None.
    Only images and PDFs are accepted; audio/video/text are ignored.
    """
    # Image message (ZAPI v2)
    img = body.get("image", {}) or {}
    if isinstance(img, dict) and img:
        url = img.get("imageUrl") or img.get("url")
        if url:
            return {"url": url, "type": "image"}

    # Document message — accept PDF only
    doc = body.get("document", {}) or {}
    if isinstance(doc, dict) and doc:
        mime = doc.get("mimeType", "") or ""
        url = doc.get("documentUrl") or doc.get("url") or doc.get("mediaUrl")
        if url and "pdf" in mime.lower():
            return {"url": url, "type": "pdf"}

    # Fallback: top-level imageUrl/mediaUrl (some ZAPI versions)
    for key in ("imageUrl", "mediaUrl"):
        val = body.get(key)
        if val and isinstance(val, str):
            return {"url": val, "type": "image"}

    return None
