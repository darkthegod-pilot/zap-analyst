from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.receipt import Receipt, ReceiptStatus
from app.schemas.receipt import ReceiptResponse, ReceiptStatusUpdate, StatsResponse
from app.models.client import Client

router = APIRouter(prefix="/receipts", tags=["receipts"])


@router.get("", response_model=List[ReceiptResponse])
def list_receipts(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Receipt)
    if status:
        try:
            q = q.filter(Receipt.status == ReceiptStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    receipts = q.order_by(Receipt.received_at.desc()).offset(offset).limit(limit).all()
    return receipts


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Receipt).count()
    pending = db.query(Receipt).filter(Receipt.status == ReceiptStatus.pending).count()
    approved = db.query(Receipt).filter(Receipt.status == ReceiptStatus.approved).count()
    rejected = db.query(Receipt).filter(Receipt.status == ReceiptStatus.rejected).count()
    suspicious = db.query(Receipt).filter(Receipt.status == ReceiptStatus.suspicious).count()
    total_clients = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.active == True).count()
    return StatsResponse(
        total=total,
        pending=pending,
        approved=approved,
        rejected=rejected,
        suspicious=suspicious,
        total_clients=total_clients,
        active_clients=active_clients,
    )


@router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.patch("/{receipt_id}/approve", response_model=ReceiptResponse)
def approve_receipt(
    receipt_id: int,
    body: ReceiptStatusUpdate = ReceiptStatusUpdate(),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    receipt.status = ReceiptStatus.approved
    receipt.auto_processed = False
    if body.notes:
        receipt.notes = body.notes
    db.commit()
    db.refresh(receipt)
    return receipt


@router.patch("/{receipt_id}/reject", response_model=ReceiptResponse)
def reject_receipt(
    receipt_id: int,
    body: ReceiptStatusUpdate = ReceiptStatusUpdate(),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    receipt.status = ReceiptStatus.rejected
    receipt.auto_processed = False
    if body.notes:
        receipt.notes = body.notes
    db.commit()
    db.refresh(receipt)
    return receipt
