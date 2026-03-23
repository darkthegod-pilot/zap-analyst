from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.database import Base


class DailyPayment(Base):
    __tablename__ = "daily_payments"

    id           = Column(Integer, primary_key=True, index=True)
    client_id    = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_date = Column(Date, nullable=False, index=True)
    status       = Column(String(20), nullable=False)
    # "paid_on_time" | "paid_late" | "missed"
    receipt_id   = Column(Integer, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True)
    penalty      = Column(Integer, default=0)
    created_at   = Column(DateTime, default=datetime.utcnow)

    client  = relationship("Client", back_populates="daily_payments")
    receipt = relationship("Receipt")
