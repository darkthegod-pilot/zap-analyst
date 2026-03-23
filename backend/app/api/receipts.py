from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.client import Client
from app.models.database import get_db
from app.models.receipt import Receipt, Analysis, ReceiptStatus
from app.schemas.receipt import (
    PaginatedReceipts,
    ReceiptResponse,
    ReceiptStatusUpdate,
    StatsResponse,
)
from app.services.score_calculator import on_receipt_approved

router = APIRouter(prefix="/receipts", tags=["receipts"])

PAGE_SIZE = 20


def _apply_date_filters(q, date_from: Optional[str], date_to: Optional[str]):
    """Apply date range filters to a SQLAlchemy query on Receipt.received_at."""
    if date_from:
        try:
            dt = datetime.strptime(date_from, "%Y-%m-%d")
            q = q.filter(Receipt.received_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            # include the full day
            dt = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Receipt.received_at < dt)
        except ValueError:
            pass
    return q


@router.get("", response_model=PaginatedReceipts)
def list_receipts(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = PAGE_SIZE,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Receipt).join(Client, Receipt.client_id == Client.id, isouter=True)
    if status:
        try:
            query = query.filter(Receipt.status == ReceiptStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Status inválido: {status}")
    query = _apply_date_filters(query, date_from, date_to)
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            or_(Client.name.ilike(q_like), Client.phone.ilike(q_like))
        )
    total = query.count()
    items = query.order_by(Receipt.received_at.desc()).offset(offset).limit(limit).all()
    return PaginatedReceipts(items=items, total=total, limit=limit, offset=offset)


@router.get("/stats", response_model=StatsResponse)
def get_stats(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    base = db.query(Receipt)
    base = _apply_date_filters(base, date_from, date_to)

    total = base.count()
    pending = base.filter(Receipt.status == ReceiptStatus.pending).count()
    approved = base.filter(Receipt.status == ReceiptStatus.approved).count()
    rejected = base.filter(Receipt.status == ReceiptStatus.rejected).count()
    suspicious = base.filter(Receipt.status == ReceiptStatus.suspicious).count()
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


@router.get("/{receipt_id}/file")
def get_receipt_file(receipt_id: int, db: Session = Depends(get_db)):
    """Serve the receipt image or PDF file directly."""
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt or not receipt.image_path or not Path(receipt.image_path).exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    media_type = "application/pdf" if receipt.image_path.endswith(".pdf") else "image/jpeg"
    return FileResponse(receipt.image_path, media_type=media_type)


@router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprovante não encontrado")
    return receipt


@router.patch("/{receipt_id}/approve", response_model=ReceiptResponse)
def approve_receipt(
    receipt_id: int,
    body: ReceiptStatusUpdate = ReceiptStatusUpdate(),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprovante não encontrado")
    receipt.status = ReceiptStatus.approved
    receipt.auto_processed = False
    if body.notes:
        receipt.notes = body.notes
    db.commit()
    db.refresh(receipt)
    on_receipt_approved(receipt.id, db)
    return receipt


@router.patch("/{receipt_id}/reject", response_model=ReceiptResponse)
def reject_receipt(
    receipt_id: int,
    body: ReceiptStatusUpdate = ReceiptStatusUpdate(),
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprovante não encontrado")
    receipt.status = ReceiptStatus.rejected
    receipt.auto_processed = False
    if body.notes:
        receipt.notes = body.notes
    db.commit()
    db.refresh(receipt)
    return receipt


async def _do_reanalyze(receipt_id: int):
    from app.models.database import SessionLocal
    from app.services.analyzer import analyze_receipt
    db = SessionLocal()
    try:
        receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
        if not receipt:
            return
        receipt.status = ReceiptStatus.pending
        receipt.auto_processed = False
        analysis = db.query(Analysis).filter(Analysis.receipt_id == receipt_id).first()
        if analysis:
            analysis.error = None
        db.commit()
        await analyze_receipt(receipt_id, db)
    finally:
        db.close()


@router.post("/{receipt_id}/reanalyze")
async def reanalyze_receipt(
    receipt_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    receipt = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Comprovante não encontrado")
    background_tasks.add_task(_do_reanalyze, receipt_id)
    return {"ok": True}


class BulkActionBody(BaseModel):
    ids: List[int]
    action: str  # "approve" | "reject"


@router.post("/bulk")
def bulk_action(body: BulkActionBody, db: Session = Depends(get_db)):
    if not body.ids:
        raise HTTPException(status_code=400, detail="Nenhum comprovante selecionado")
    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Ação inválida. Use 'approve' ou 'reject'")
    new_status = ReceiptStatus.approved if body.action == "approve" else ReceiptStatus.rejected
    db.query(Receipt).filter(Receipt.id.in_(body.ids)).update(
        {"status": new_status, "auto_processed": False},
        synchronize_session=False,
    )
    db.commit()

    if body.action == "approve":
        for rid in body.ids:
            on_receipt_approved(rid, db)

    return {"ok": True, "updated": len(body.ids)}
