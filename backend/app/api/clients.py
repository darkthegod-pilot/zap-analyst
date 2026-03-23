from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientResponse

router = APIRouter(prefix="/clients", tags=["clients"])

PAGE_SIZE = 20


class PaginatedClients(BaseModel):
    items: List[ClientResponse]
    total: int
    limit: int
    offset: int


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
    limit: int = PAGE_SIZE,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Client)
    q = _apply_date_filters(q, date_from, date_to)
    total = q.count()
    clients = q.order_by(Client.registered_at.desc()).offset(offset).limit(limit).all()
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
def update_client_name(client_id: int, name: str, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.name = name
    db.commit()
    return {"ok": True}
