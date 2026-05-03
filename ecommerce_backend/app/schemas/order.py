from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.models.order import OrderStatusEnum


class OrderStatusUpdate(BaseModel):
    status: OrderStatusEnum

class OrderItemResponse(BaseModel):
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    status: OrderStatusEnum
    total: float
    created_at: datetime
    items: List[OrderItemResponse]
    init_point: str | None = None

    class Config:
        from_attributes = True