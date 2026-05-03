from pydantic import BaseModel, Field
from typing import List

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product_name: str
    unit_price: float
    subtotal: float

class CartResponse(BaseModel):
    id: int
    items: List[CartItemResponse]
    subtotal_general: float
    tax: float # 18% IGV
    total: float