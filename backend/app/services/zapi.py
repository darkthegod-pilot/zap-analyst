import httpx
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _resolve(effective: dict | None, key: str, fallback: str) -> str:
    """Return DB-effective value if present, otherwise .env fallback."""
    if effective:
        val = effective.get(key, "")
        if val:
            return str(val)
    return fallback


async def send_text(phone: str, message: str, effective: dict | None = None) -> bool:
    """Send a text message via ZAPI, using DB-effective credentials if provided."""
    instance_id = _resolve(effective, "zapi_instance_id", settings.zapi_instance_id)
    token       = _resolve(effective, "zapi_token",       settings.zapi_token)
    sec_token   = _resolve(effective, "zapi_security_token", settings.zapi_security_token)

    if not instance_id or not token:
        logger.warning("ZAPI not configured — skipping send_text")
        return False
    try:
        url = f"https://api.z-api.io/instances/{instance_id}/token/{token}/send-text"
        headers = {"Content-Type": "application/json"}
        if sec_token:
            headers["Client-Token"] = sec_token
        payload = {"phone": phone, "message": message}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info(f"Message sent to {phone}")
            return True
    except Exception as e:
        logger.error(f"ZAPI send_text failed: {e}")
        return False


async def download_image(image_url: str, effective: dict | None = None) -> bytes | None:
    """Download an image from ZAPI media URL, with auth headers."""
    sec_token = _resolve(effective, "zapi_security_token", settings.zapi_security_token)
    headers = {}
    if sec_token:
        headers["Client-Token"] = sec_token
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(image_url, headers=headers, follow_redirects=True)
            resp.raise_for_status()
            return resp.content
    except Exception as e:
        logger.error(f"Image download failed: {e}")
        return None
