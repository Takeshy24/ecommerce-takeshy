from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from app.database import get_db
from app.models.order import Order, OrderStatusEnum
from app.models.catalog import Product, Category
from app.core.security import get_current_user
from app.models.user import User, RoleEnum

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

# Dependencia para asegurar que solo un Admin acceda
def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
    return current_user

@router.get("/metrics")
def get_kpi_metrics(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    today = date.today()
    
    # 1. Ventas del día (Ingresos totales hoy)
    ventas_hoy = db.query(func.sum(Order.total)).filter(
        func.date(Order.created_at) == today,
        Order.status != OrderStatusEnum.cancelado
    ).scalar() or 0.0

    # 2. Pedidos activos (Pendientes o Procesando)
    pedidos_activos = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatusEnum.pendiente, OrderStatusEnum.procesando])
    ).scalar() or 0

    # 3. Productos con bajo stock (Menos de 10 unidades)
    bajo_stock = db.query(func.count(Product.id)).filter(Product.stock < 10).scalar() or 0

    # 4. Ingresos del mes actual
    current_month = datetime.now().month
    current_year = datetime.now().year
    ingresos_mes = db.query(func.sum(Order.total)).filter(
        func.extract('month', Order.created_at) == current_month,
        func.extract('year', Order.created_at) == current_year,
        Order.status != OrderStatusEnum.cancelado
    ).scalar() or 0.0

    return {
        "ventas_hoy": ventas_hoy,
        "pedidos_activos": pedidos_activos,
        "productos_bajo_stock": bajo_stock,
        "ingresos_mes": ingresos_mes
    }

@router.get("/sales-chart")
def get_sales_chart_data(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    current_year = datetime.now().year
    sales_by_month = (
        db.query(
            func.to_char(Order.created_at, "YYYY-MM").label("period"),
            func.sum(Order.total).label("total"),
        )
        .filter(
            func.extract("year", Order.created_at) == current_year,
            Order.status != OrderStatusEnum.cancelado,
        )
        .group_by("period")
        .order_by("period")
        .all()
    )

    labels = [row.period for row in sales_by_month]
    data = [float(row.total or 0) for row in sales_by_month]

    return {"labels": labels, "data": data}


@router.get("/category-distribution")
def get_category_distribution(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    category_rows = (
        db.query(
            Category.name.label("name"),
            func.count(Product.id).label("count"),
        )
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id, Category.name)
        .order_by(Category.name.asc())
        .all()
    )

    labels = [row.name for row in category_rows]
    data = [int(row.count or 0) for row in category_rows]

    return {"labels": labels, "data": data}