from sqlalchemy import Column, Integer, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from .base import Base, TimestampMixin

class OrderStatusEnum(str, enum.Enum):
    pendiente = "pendiente"
    procesando = "procesando"
    enviado = "enviado"
    entregado = "entregado"
    cancelado = "cancelado"

class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(Enum(OrderStatusEnum), default=OrderStatusEnum.pendiente, nullable=False)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total = Column(Float, nullable=False)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False) # Precio al momento de la compra

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    @property
    def product_name(self) -> str:
        return self.product.name if self.product else ""

    @property
    def subtotal(self) -> float:
        return float(self.quantity * self.unit_price)