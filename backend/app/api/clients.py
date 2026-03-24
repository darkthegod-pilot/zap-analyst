import re
from datetime import datetime, timedelta, date
from typing import List, Optional

import pytz
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from app.core.tz import brt_day_start_utc, brt_day_end_utc
from app.models.database import get_db
from app.models.client import Client
from app.models.daily_payment import DailyPayment
from app.models.receipt import Receipt, ReceiptStatus
from app.schemas.client import ClientCreate, ClientResponse, ClientScoreResponse, PaymentHistoryItem

BRT = pytz.timezone("America/Sao_Paulo")

router = APIRouter(prefix="/clients", tags=["clients"])

PAGE_SIZE = 50


class PaginatedClients(BaseModel):
    items: List[ClientResponse]
    total: int
    limit: int
    offset: int


class NameBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class NotesBody(BaseModel):
    notes: Optional[str] = Field(None, max_length=2000)


class BulkClientBody(BaseModel):
    ids: List[int]
    action: str  # 'freeze' | 'unfreeze' | 'delete' | 'activate'


def _apply_date_filters(q, date_from: Optional[str], date_to: Optional[str]):
    """Filter by registered_at. Dates are BRT calendar days, converted to UTC."""
    if date_from:
        try:
            d = datetime.strptime(date_from, "%Y-%m-%d").date()
            q = q.filter(Client.registered_at >= brt_day_start_utc(d))
        except ValueError:
            pass
    if date_to:
        try:
            d = datetime.strptime(date_to, "%Y-%m-%d").date()
            q = q.filter(Client.registered_at < brt_day_end_utc(d))
        except ValueError:
            pass
    return q


def _receipt_count_subquery(db: Session):
    return (
        db.query(func.count(Receipt.id).label("cnt"), Receipt.client_id)
        .group_by(Receipt.client_id)
        .subquery()
    )


def _to_response(row) -> ClientResponse:
    """Accept either a Client object or a (Client, count) tuple."""
    if isinstance(row, tuple):
        client, count = row[0], row[1]
    else:
        client, count = row, 0
    cr = ClientResponse.model_validate(client)
    cr.receipts_count = int(count or 0)
    return cr


@router.get("", response_model=PaginatedClients)
def list_clients(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    status: Optional[str] = None,  # 'active' | 'frozen' | 'inactive'
    limit: int = PAGE_SIZE,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    rc_sq = _receipt_count_subquery(db)
    query = (
        db.query(Client, func.coalesce(rc_sq.c.cnt, 0).label("receipts_count"))
        .outerjoin(rc_sq, Client.id == rc_sq.c.client_id)
    )
    query = _apply_date_filters(query, date_from, date_to)
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            or_(Client.name.ilike(q_like), Client.phone.ilike(q_like))
        )
    if status == 'frozen':
        query = query.filter(Client.frozen == True)
    elif status == 'active':
        query = query.filter(Client.active == True, Client.frozen == False)
    elif status == 'inactive':
        query = query.filter(Client.active == False)

    total = query.count()
    rows = query.order_by(Client.registered_at.desc()).offset(offset).limit(limit).all()
    return PaginatedClients(
        items=[_to_response(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.phone == body.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Telefone já cadastrado")
    client = Client(phone=body.phone, name=body.name, active=True, frozen=False)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _to_response((client, 0))


@router.post("/bulk")
def bulk_clients(body: BulkClientBody, db: Session = Depends(get_db)):
    """Bulk freeze / unfreeze / delete / activate clients."""
    if body.action not in ("freeze", "unfreeze", "delete", "activate"):
        raise HTTPException(status_code=400, detail=f"Ação inválida: {body.action}")
    clients_list = db.query(Client).filter(Client.id.in_(body.ids)).all()
    for c in clients_list:
        if body.action == "freeze":
            c.frozen = True
        elif body.action == "unfreeze":
            c.frozen = False
            c.active = True
        elif body.action == "activate":
            c.active = True
            c.frozen = False
        elif body.action == "delete":
            db.delete(c)
    db.commit()
    return {"ok": True, "affected": len(clients_list)}


@router.get("/calote", response_model=PaginatedClients)
def list_calote_clients(
    limit: int = PAGE_SIZE,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List clients flagged as calote (7+ consecutive missed days)."""
    rc_sq = _receipt_count_subquery(db)
    q = (
        db.query(Client, func.coalesce(rc_sq.c.cnt, 0).label("receipts_count"))
        .outerjoin(rc_sq, Client.id == rc_sq.c.client_id)
        .filter(Client.calote == True)
    )
    total = q.count()
    rows = q.order_by(Client.days_overdue.desc()).offset(offset).limit(limit).all()
    return PaginatedClients(
        items=[_to_response(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    rc_sq = _receipt_count_subquery(db)
    row = (
        db.query(Client, func.coalesce(rc_sq.c.cnt, 0).label("receipts_count"))
        .outerjoin(rc_sq, Client.id == rc_sq.c.client_id)
        .filter(Client.id == client_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return _to_response(row)


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
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Fetch only approved receipts with their analysis in one query
    approved_receipts = (
        db.query(Receipt)
        .options(joinedload(Receipt.analysis))
        .filter(Receipt.client_id == client_id, Receipt.status == ReceiptStatus.approved)
        .all()
    )
    amounts = [
        _parse_amount_local(r.analysis.amount)
        for r in approved_receipts
        if r.analysis and r.analysis.amount
    ]
    total_amount = round(sum(amounts), 2)
    profit = round(total_amount * 0.56, 2)
    avg_ticket = round(total_amount / len(amounts), 2) if amounts else 0.0

    # Fetch most recent 10 receipts via SQL (no Python sort)
    recent = (
        db.query(Receipt)
        .options(joinedload(Receipt.analysis))
        .filter(Receipt.client_id == client_id)
        .order_by(Receipt.received_at.desc())
        .limit(10)
        .all()
    )
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
        "payment_count": len(approved_receipts),
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
