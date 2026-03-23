"""
Auth API — PIN-based access control for the dashboard.
A valid token is stored in memory with a 24h TTL.
"""
import secrets
import time
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.api.settings import get_effective_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory token store: token → expiry timestamp
_tokens: dict[str, float] = {}

DEFAULT_PIN = "4344"


class PinRequest(BaseModel):
    pin: str


@router.post("/verify-pin")
def verify_pin(body: PinRequest, db: Session = Depends(get_db)):
    s = get_effective_settings(db)
    expected = s.get("dashboard_pin", DEFAULT_PIN)
    if body.pin != expected:
        raise HTTPException(status_code=401, detail="PIN incorreto")
    token = secrets.token_urlsafe(32)
    _tokens[token] = time.time() + 86400  # 24 hours
    return {"token": token}


@router.get("/check")
def check_token(token: str):
    exp = _tokens.get(token, 0)
    if time.time() > exp:
        _tokens.pop(token, None)
        raise HTTPException(status_code=401, detail="Token expirado ou inválido")
    return {"ok": True}
