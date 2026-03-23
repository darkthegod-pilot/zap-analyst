from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.receipt import ReceiptStatus


class AnalysisResponse(BaseModel):
    id: int
    confidence_score: Optional[float] = None
    is_authentic: Optional[bool] = None
    bank_name: Optional[str] = None
    amount: Optional[str] = None
    transaction_date: Optional[str] = None
    transaction_id: Optional[str] = None
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    fraud_indicators: Optional[List[str]] = []
    ai_summary: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


class ClientSummary(BaseModel):
    id: int
    phone: str
    name: Optional[str] = None

    class Config:
        from_attributes = True


class ReceiptResponse(BaseModel):
    id: int
    client_id: int
    client: Optional[ClientSummary] = None
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    received_at: datetime
    status: ReceiptStatus
    auto_processed: bool
    notes: Optional[str] = None
    analysis: Optional[AnalysisResponse] = None

    class Config:
        from_attributes = True


class ReceiptStatusUpdate(BaseModel):
    notes: Optional[str] = None


class StatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    suspicious: int
    total_clients: int
    active_clients: int


class ReportRequest(BaseModel):
    message: str
