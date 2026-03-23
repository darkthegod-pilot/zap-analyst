from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.models.database import Base


class SystemSettings(Base):
    """Runtime-editable settings stored in DB (override .env defaults)."""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
