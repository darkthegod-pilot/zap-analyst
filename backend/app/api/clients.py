import re
from datetime import datetime, timedelta, date
from typing import List, Optional

import pytz
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from sqlalchemy.orm import subqueryload

from app.models.database import get_db
from app.models.client import Client
from app.models.daily_payment import DailyPayment
from app.schemas.client import ClientCreate, ClientResponse, ClientScoreResponse, PaymentHistoryItem

BRT = pytz.timezone("America/Sao_Paulo")

router = APIRouter(prefix="/clients", tags=["clients"])

PAGE_SIZE = 20


class PaginatedClients(BaseModel):
    items: List[ClientResponse]
    total: int
    limit: int
    offset: int


class NameBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class NotesBody(BaseModel):
    notes: Optional[str] = Field(None, max_length=2000)


def _apply_date_filters(q, date_from: Optional[str], date_to: Optional[str]):
    if date_from:
        try:
            dt = datetime.strptime(date_from, "%Y-%m-%d")
            q = q.filter(Client.registered_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Client.registered_at < dt)
        except ValueError:
            pass
    return q


def _to_response(c: Client) -> ClientResponse:
    cr = ClientResponse.model_validate(c)
    cr.receipts_count = len(c.receipts)
    return cr


@router.get("", response_model=PaginatedClients)
def list_clients(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = PAGE_SIZE,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Client).options(subqueryload(Client.receipts))
    query = _apply_date_filters(query, date_from, date_to)
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            or_(Client.name.ilike(q_like), Client.phone.ilike(q_like))
        )
    total = query.count()
    clients = query.order_by(Client.registered_at.desc()).offset(offset).limit(limit).all()
    return PaginatedClients(items=[_to_response(c) for c in clients], total=total, limit=limit, offset=offset)


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.phone == body.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Telefone já cadastrado")
    client = Client(phone=body.phone, name=body.name, active=True, frozen=False)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _to_response(client)


@router.get("/calote", response_model=PaginatedClients)
def list_calote_clients(
    limit: int = PAGE_SIZE,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List clients flagged as calote (7+ consecutive missed days)."""
    q = db.query(Client).options(subqueryload(Client.receipts)).filter(Client.calote == True)
    total = q.count()
    clients_list = q.order_by(Client.days_overdue.desc()).offset(offset).limit(limit).all()
    return PaginatedClients(items=[_to_response(c) for c in clients_list], total=total, limit=limit, offset=offset)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return _to_response(client)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(client)
    db.commit()


@router.patch("/{client_id}/freeze")
def freeze_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.frozen = True
    db.commit()
    return {"ok": True, "message": f"Cliente {client.phone} congelado"}


@router.patch("/{client_id}/activate")
def activate_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.active = True
    client.frozen = False
    db.commit()
    return {"ok": True, "message": f"Cliente {client.phone} ativado"}


@router.patch("/{client_id}/deactivate")
def deactivate_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.active = False
    db.commit()
    return {"ok": True, "message": f"Cliente {client.phone} desativado"}


@router.patch("/{client_id}/name")
def update_client_name(client_id: int, body: NameBody, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.name = body.name.strip()
    db.commit()
    return {"ok": True}


@router.patch("/{client_id}/notes")
def update_client_notes(client_id: int, body: NotesBody, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.notes = body.notes.strip() if body.notes else None
    db.commit()
    return {"ok": True}


@router.get("/{client_id}/score", response_model=ClientScoreResponse)
def get_client_score(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    today = datetime.now(BRT).date()
    start = today - timedelta(days=29)

    records = {
        dp.payment_date: dp
        for dp in db.query(DailyPayment).filter(
            DailyPayment.client_id    == client_id,
            DailyPayment.payment_date >= start,
        ).all()
    }

    history: List[PaymentHistoryItem] = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        if d.weekday() == 6:  # Sunday
            history.append(PaymentHistoryItem(date=str(d), status="sunday", penalty=0))
        elif d in records:
            r = records[d]
            history.append(PaymentHistoryItem(date=str(d), status=r.status, penalty=r.penalty or 0))
        elif d < today:
            # Past business day with no record — treated as unknown (may be before registration)
            history.append(PaymentHistoryItem(date=str(d), status="unknown", penalty=0))
        else:
            history.append(PaymentHistoryItem(date=str(d), status="future", penalty=0))

    return ClientScoreResponse(
        client_id=client_id,
        score=client.score if client.score is not None else 1000,
        streak=client.streak if client.streak is not None else 0,
        history=history,
    )


def _parse_amount_local(s: Optional[str]) -> float:
    if not s:
        return 0.0
    cleaned = s.replace("R$", "").replace(".", "").replace(",", ".").strip()
    m = re.search(r"[\d.]+", cleaned)
    try:
        return float(m.group()) if m else 0.0
    except ValueError:
        return 0.0


@router.get("/{client_id}/receipts-summary")
def get_client_receipts_summary(client_id: int, db: Session = Depends(get_db)):
    """Return financial summary and last 10 receipts for a client."""
    from app.models.receipt import ReceiptStatus
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    approved = [r for r in client.receipts if r.status == ReceiptStatus.approved]
    amounts = [
        _parse_amount_local(r.analysis.amount)
        for r in approved
        if r.analysis and r.analysis.amount
    ]
    total_amount = round(sum(amounts), 2)
    profit = round(total_amount * 0.56, 2)
    avg_ticket = round(total_amount / len(amounts), 2) if amounts else 0.0

    recent = sorted(client.receipts, key=lambda x: x.received_at, reverse=True)[:10]
    receipts_data = [
        {
            "id": r.id,
            "status": r.status.value,
            "received_at": r.received_at.isoformat(),
            "amount": r.analysis.amount if r.analysis else None,
            "bank_name": r.analysis.bank_name if r.analysis else None,
            "is_duplicate": r.is_duplicate,
        }
        for r in recent
    ]

    return {
        "total_amount": total_amount,
        "profit": profit,
        "avg_ticket": avg_ticket,
        "payment_count": len(approved),
        "receipts": receipts_data,
    }


@router.patch("/{client_id}/remove-calote")
def remove_calote(client_id: int, db: Session = Depends(get_db)):
    """Manually remove calote flag from a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.calote = False
    client.days_overdue = 0
    db.commit()
    return {"ok": True}
