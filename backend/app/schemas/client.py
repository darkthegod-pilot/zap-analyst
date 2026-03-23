from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ClientBase(BaseModel):
    phone: str
    name: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientResponse(ClientBase):
    id: int
    registered_at: datetime
    active: bool
    frozen: bool = False
    receipts_count: Optional[int] = 0

    class Config:
        from_attributes = True
