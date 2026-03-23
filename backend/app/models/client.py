from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)
    frozen = Column(Boolean, default=False)
    score  = Column(Integer, default=1000)
    streak = Column(Integer, default=0)
    calote = Column(Boolean, default=False, index=True)
    days_overdue = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    receipts = relationship("Receipt", back_populates="client")
    daily_payments = relationship("DailyPayment", back_populates="client", cascade="all, delete-orphan")
