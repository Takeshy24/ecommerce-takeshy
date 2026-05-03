from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str
    price: float = Field(..., gt=0, description="El precio debe ser mayor a 0")
    stock: int = Field(0, ge=0, description="El stock no puede ser negativo")
    category_id: int
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedProductResponse(BaseModel):
    total: int
    items: List[ProductResponse]