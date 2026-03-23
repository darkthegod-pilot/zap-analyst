from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.client import Client
from app.schemas.client import ClientResponse

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientResponse])
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).order_by(Client.registered_at.desc()).all()
    result = []
    for c in clients:
        cr = ClientResponse.model_validate(c)
        cr.receipts_count = len(c.receipts)
        result.append(cr)
    return result


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    cr = ClientResponse.model_validate(client)
    cr.receipts_count = len(client.receipts)
    return cr


@router.patch("/{client_id}/deactivate")
def deactivate_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.active = False
    db.commit()
    return {"ok": True, "message": f"Client {client.phone} deactivated"}


@router.patch("/{client_id}/name")
def update_client_name(client_id: int, name: str, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.name = name
    db.commit()
    return {"ok": True}
