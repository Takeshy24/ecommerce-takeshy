from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.order import Order, OrderStatusEnum
from app.models.user import RoleEnum, User
from app.schemas.order import OrderResponse, OrderStatusUpdate

router = APIRouter(prefix="/admin/orders", tags=["Admin Orders"])


def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
    return current_user


@router.get("", response_model=List[OrderResponse])
def get_all_orders(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    allowed_transitions = {
        OrderStatusEnum.pendiente: [OrderStatusEnum.procesando, OrderStatusEnum.enviado, OrderStatusEnum.cancelado],
        OrderStatusEnum.procesando: [OrderStatusEnum.enviado, OrderStatusEnum.cancelado],
        OrderStatusEnum.enviado: [OrderStatusEnum.entregado],
        OrderStatusEnum.entregado: [],
        OrderStatusEnum.cancelado: [],
    }

    if payload.status == order.status:
        return order

    if payload.status not in allowed_transitions[order.status]:
        raise HTTPException(
            status_code=400,
            detail=f"Transición inválida de '{order.status.value}' a '{payload.status.value}'",
        )

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
