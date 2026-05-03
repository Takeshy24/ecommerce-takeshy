from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.catalog import Product
from app.models.order import Order, OrderStatusEnum
from app.core.security import get_current_user
from app.models.user import User, RoleEnum

import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from datetime import datetime

router = APIRouter(prefix="/admin/reports", tags=["Reports"])

# Dependencia de Admin (reutilizada de la fase anterior)
def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
    return current_user

@router.get("/operational/inventory-pdf")
def generate_inventory_report(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    # 1. Preparar el buffer de memoria
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # 2. Título
    elements.append(Paragraph("Reporte Operacional: Inventario Actual", styles['Title']))
    elements.append(Paragraph(f"Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # 3. Obtener datos
    products = db.query(Product).order_by(Product.stock.asc()).all()
    
    # 4. Construir la Tabla
    data = [["ID", "Producto", "Precio", "Stock", "Estado"]] # Cabeceras
    for p in products:
        estado = "Crítico" if p.stock < 10 else "Normal"
        data.append([str(p.id), p.name, f"${p.price:.2f}", str(p.stock), estado])

    table = Table(data, colWidths=[40, 200, 80, 60, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2196f3")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    # 5. Preparar la respuesta HTTP
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=inventario_actual.pdf"}
    )

@router.get("/management/monthly-summary-pdf")
def generate_monthly_summary(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("Reporte Gerencial: Resumen Mensual de Ventas", styles["Title"]))
    elements.append(Paragraph(f"Fecha de generación: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    rows = (
        db.query(
            func.to_char(Order.created_at, "YYYY-MM").label("periodo"),
            func.count(Order.id).label("pedidos"),
            func.sum(Order.total).label("ingresos"),
        )
        .filter(Order.status != OrderStatusEnum.cancelado)
        .group_by("periodo")
        .order_by("periodo")
        .all()
    )

    table_data = [["Periodo", "Pedidos", "Ingresos"]]
    for row in rows:
        table_data.append([
            row.periodo,
            str(row.pedidos),
            f"S/ {float(row.ingresos or 0):.2f}",
        ])

    if len(table_data) == 1:
        table_data.append(["Sin datos", "0", "S/ 0.00"])

    table = Table(table_data, colWidths=[130, 100, 120])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2e7d32")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ]))

    elements.append(table)
    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=resumen_mensual_ventas.pdf"},
    )


@router.get("/management/order-detail-pdf/{order_id}")
def generate_order_detail_pdf(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph(f"Detalle de Pedido #{order.id}", styles["Title"]))
    elements.append(Paragraph(f"Fecha: {order.created_at.strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Paragraph(f"Estado: {order.status.value}", styles["Normal"]))
    elements.append(Paragraph(f"Total: S/ {order.total:.2f}", styles["Normal"]))
    elements.append(Spacer(1, 18))

    table_data = [["Producto", "Cantidad", "Precio Unitario", "Subtotal"]]
    for item in order.items:
        product_name = item.product.name if item.product else f"Producto {item.product_id}"
        table_data.append([
            product_name,
            str(item.quantity),
            f"S/ {item.unit_price:.2f}",
            f"S/ {item.quantity * item.unit_price:.2f}",
        ])

    table = Table(table_data, colWidths=[220, 80, 110, 100])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ef6c00")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ]))

    elements.append(table)
    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=pedido_{order_id}.pdf"},
    )