import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _base_url() -> str:
    return (
        f"https://api.z-api.io/instances/{settings.zapi_instance_id}"
        f"/token/{settings.zapi_token}"
    )


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Client-Token": settings.zapi_security_token,
    }


async def send_text(phone: str, message: str) -> bool:
    """Send a text message via ZAPI."""
    if not settings.zapi_instance_id or not settings.zapi_token:
        logger.warning("ZAPI not configured — skipping send_text")
        return False
    try:
        url = f"{_base_url()}/send-text"
        payload = {"phone": phone, "message": message}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=_headers())
            resp.raise_for_status()
            logger.info(f"Message sent to {phone}")
            return True
    except Exception as e:
        logger.error(f"ZAPI send_text failed: {e}")
        return False


async def download_image(image_url: str) -> bytes | None:
    """Download an image from ZAPI media URL."""
    try:
        headers = _headers()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(image_url, headers=headers, follow_redirects=True)
            resp.raise_for_status()
            return resp.content
    except Exception as e:
        logger.error(f"Image download failed: {e}")
        return None
