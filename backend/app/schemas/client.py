from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List


class ClientBase(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    name: Optional[str] = Field(None, max_length=100)

    @validator('phone')
    def phone_digits_only(cls, v):
        if not v.isdigit():
            raise ValueError('Telefone deve conter apenas dígitos')
        return v


class ClientCreate(ClientBase):
    pass


class ClientResponse(ClientBase):
    id: int
    registered_at: datetime
    active: bool
    frozen: bool = False
    score: int = 1000
    streak: int = 0
    calote: bool = False
    days_overdue: int = 0
    receipts_count: Optional[int] = 0
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentHistoryItem(BaseModel):
    date: str
    status: str   # "paid_on_time"|"paid_late"|"missed"|"sunday"|"future"|"unknown"
    penalty: int = 0


class ClientScoreResponse(BaseModel):
    client_id: int
    score: int
    streak: int
    history: List[PaymentHistoryItem]
