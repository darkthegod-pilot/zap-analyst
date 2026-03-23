"""
Settings API — read/write runtime config + test endpoints for ZAPI and OpenAI.
Settings are stored in the DB (system_settings table) and override .env defaults.
"""
import logging
from typing import Any, Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.database import get_db
from app.models.system_settings import SystemSettings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])

# Keys that are persisted to DB
ALLOWED_KEYS = {
    "zapi_instance_id",
    "zapi_token",
    "zapi_security_token",
    "openai_api_key",
    "openai_model",
    "admin_phone",
    "auto_approve_threshold",
    "base_url",
    "dashboard_pin",
}


def _get_all(db: Session) -> Dict[str, str]:
    rows = db.query(SystemSettings).all()
    return {r.key: r.value for r in rows}


def _upsert(db: Session, key: str, value: str):
    row = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if row:
        row.value = value
    else:
        db.add(SystemSettings(key=key, value=value))
    db.commit()


def get_effective_settings(db: Session) -> Dict[str, Any]:
    """Merge .env defaults with DB overrides."""
    cfg = get_settings()
    db_vals = _get_all(db)
    result = {
        "zapi_instance_id":       db_vals.get("zapi_instance_id",       cfg.zapi_instance_id),
        "zapi_token":             db_vals.get("zapi_token",             cfg.zapi_token),
        "zapi_security_token":    db_vals.get("zapi_security_token",    cfg.zapi_security_token),
        "openai_api_key":         db_vals.get("openai_api_key",         cfg.openai_api_key),
        "openai_model":           db_vals.get("openai_model",           cfg.openai_model),
        "admin_phone":            db_vals.get("admin_phone",            cfg.admin_phone),
        "auto_approve_threshold": db_vals.get("auto_approve_threshold", str(cfg.auto_approve_threshold)),
        "base_url":               db_vals.get("base_url",               cfg.base_url),
        "dashboard_pin":          db_vals.get("dashboard_pin",          "4344"),
    }
    return result


# ── Schemas ──────────────────────────────────────────────────────────────────

class SettingsResponse(BaseModel):
    zapi_instance_id:       str
    zapi_token:             str
    zapi_security_token:    str
    openai_api_key:         str
    openai_model:           str
    admin_phone:            str
    auto_approve_threshold: str
    base_url:               str
    webhook_url:            str   # computed


class SettingsSaveRequest(BaseModel):
    zapi_instance_id:       str | None = None
    zapi_token:             str | None = None
    zapi_security_token:    str | None = None
    openai_api_key:         str | None = None
    openai_model:           str | None = None
    admin_phone:            str | None = None
    auto_approve_threshold: str | None = None
    base_url:               str | None = None

    @validator('auto_approve_threshold')
    def validate_threshold(cls, v):
        if v is None:
            return v
        try:
            f = float(v)
            if not 0.0 <= f <= 1.0:
                raise ValueError("Deve ser entre 0.0 e 1.0")
            return str(f)
        except (ValueError, TypeError):
            raise ValueError("Valor inválido para threshold. Deve ser entre 0.0 e 1.0")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=SettingsResponse)
def read_settings(db: Session = Depends(get_db)):
    s = get_effective_settings(db)
    base = s["base_url"].rstrip("/")
    return SettingsResponse(
        **s,
        webhook_url=f"{base}/webhook/zapi",
    )


@router.put("")
def save_settings(body: SettingsSaveRequest, db: Session = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    for key, value in data.items():
        if key in ALLOWED_KEYS:
            _upsert(db, key, str(value))
    return {"ok": True, "saved": list(data.keys())}


@router.post("/test-zapi")
async def test_zapi(db: Session = Depends(get_db)):
    """
    Verify ZAPI credentials against the user's server at 187.77.242.86.
    Calls GET https://api.z-api.io/instances/{instance_id}/token/{token}/status
    """
    s = get_effective_settings(db)
    instance_id = s["zapi_instance_id"]
    token       = s["zapi_token"]
    sec_token   = s["zapi_security_token"]

    if not instance_id or not token:
        raise HTTPException(400, "Configure instance_id e token antes de testar")

    url = f"https://api.z-api.io/instances/{instance_id}/token/{token}/status"
    headers = {"Client-Token": sec_token} if sec_token else {}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)
        data = resp.json()
        connected = data.get("connected", False)
        return {
            "ok": resp.status_code == 200,
            "connected": connected,
            "status_code": resp.status_code,
            "data": data,
        }
    except Exception as e:
        raise HTTPException(502, f"Erro ao conectar na ZAPI: {e}")


@router.post("/test-openai")
async def test_openai(db: Session = Depends(get_db)):
    """Verify OpenAI API key with a minimal completion."""
    s = get_effective_settings(db)
    api_key = s["openai_api_key"]

    if not api_key:
        raise HTTPException(400, "Configure a chave OpenAI antes de testar")

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Reply with only the word OK"}],
            max_tokens=5,
            temperature=0,
        )
        reply = resp.choices[0].message.content.strip()
        return {"ok": True, "reply": reply, "model": resp.model}
    except Exception as e:
        raise HTTPException(502, f"Erro OpenAI: {e}")
