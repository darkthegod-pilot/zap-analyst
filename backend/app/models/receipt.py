from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.database import Base


class ReceiptStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspicious = "suspicious"


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    image_url = Column(Text, nullable=True)
    image_path = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)
    status = Column(SAEnum(ReceiptStatus), default=ReceiptStatus.pending)
    auto_processed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    client = relationship("Client", back_populates="receipts")
    analysis = relationship("Analysis", back_populates="receipt", uselist=False)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=False, unique=True)
    confidence_score = Column(Float, nullable=True)
    is_authentic = Column(Boolean, nullable=True)
    bank_name = Column(String(100), nullable=True)
    amount = Column(String(50), nullable=True)
    transaction_date = Column(String(20), nullable=True)
    transaction_id = Column(String(200), nullable=True)
    sender_name = Column(String(200), nullable=True)
    recipient_name = Column(String(200), nullable=True)
    fraud_indicators = Column(JSON, default=list)
    ai_summary = Column(Text, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    error = Column(Text, nullable=True)

    receipt = relationship("Receipt", back_populates="analysis")
