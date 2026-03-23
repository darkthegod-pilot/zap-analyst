"""
Auth API — PIN-based access control for the dashboard.
A valid token is stored in memory with a 24h TTL.
"""
import secrets
import time
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.api.settings import get_effective_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)

# In-memory token store: token → expiry timestamp
_tokens: dict[str, float] = {}

# Rate limiting: ip → list of attempt timestamps (last 5 min)
_attempts: dict[str, list] = {}

DEFAULT_PIN = "4344"
_WINDOW = 300   # 5 minutes
_MAX_ATTEMPTS = 10


def _cleanup_tokens():
    now = time.time()
    expired = [k for k, v in list(_tokens.items()) if now > v]
    for k in expired:
        del _tokens[k]


def _check_rate_limit(ip: str):
    now = time.time()
    attempts = [t for t in _attempts.get(ip, []) if now - t < _WINDOW]
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Muitas tentativas. Aguarde 5 minutos.")
    _attempts[ip] = attempts + [now]


class PinRequest(BaseModel):
    pin: str


@router.post("/verify-pin")
def verify_pin(body: PinRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    _cleanup_tokens()
    _check_rate_limit(ip)
    s = get_effective_settings(db)
    expected = s.get("dashboard_pin", DEFAULT_PIN)
    if body.pin != expected:
        raise HTTPException(status_code=401, detail="PIN incorreto")
    # Clear rate limit on success
    _attempts.pop(ip, None)
    token = secrets.token_urlsafe(32)
    _tokens[token] = time.time() + 86400  # 24 hours
    return {"token": token}


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(_bearer)):
    """FastAPI dependency — validates Bearer token on protected routes."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    _cleanup_tokens()
    token = credentials.credentials
    exp = _tokens.get(token, 0)
    if time.time() > exp:
        _tokens.pop(token, None)
        raise HTTPException(status_code=401, detail="Token expirado ou inválido")


@router.get("/check")
def check_token(token: str):
    _cleanup_tokens()
    exp = _tokens.get(token, 0)
    if time.time() > exp:
        _tokens.pop(token, None)
        raise HTTPException(status_code=401, detail="Token expirado ou inválido")
    return {"ok": True}
