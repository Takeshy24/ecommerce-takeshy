from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import os
import mercadopago

from app.database import get_db
from app.models.cart import Cart
from app.models.order import Order, OrderItem, OrderStatusEnum
from app.models.catalog import Product
from app.models.user import User
from app.schemas.order import OrderResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])

# Reemplaza con tu Access Token de MercadoPago (Modo Sandbox o Producción)
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "APP_USR-8291479765780216-050122-fae39f501587a0be000d2ff1dd098059-3372300982")
sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

@router.post("/checkout", response_model=OrderResponse)
def create_order(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Obtener el carrito
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    # 2. Calcular totales y verificar stock
    subtotal_general = 0.0
    order_items_to_create = []
    mp_items = []

    for cart_item in cart.items:
        product = db.query(Product).filter(Product.id == cart_item.product_id).first()
        if product.stock < cart_item.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}")
        
        # Reducir stock
        product.stock -= cart_item.quantity
        
        item_subtotal = product.price * cart_item.quantity
        subtotal_general += item_subtotal
        
        # Preparar el item de la orden (congelando el precio actual)
        order_items_to_create.append(OrderItem(
            product_id=product.id,
            quantity=cart_item.quantity,
            unit_price=product.price
        ))

        # Agregar item para MercadoPago
        mp_items.append({
            "id": str(product.id),
            "title": product.name,
            "quantity": cart_item.quantity,
            "unit_price": float(product.price),
            "currency_id": "PEN"
        })

    # 3. Crear la Orden
    tax = subtotal_general * 0.18
    new_order = Order(
        user_id=current_user.id,
        subtotal=subtotal_general,
        tax=tax,
        total=subtotal_general + tax,
        items=order_items_to_create
    )

    db.add(new_order)
    
    # 4. Vaciar el carrito
    for item in cart.items:
        db.delete(item)
    
    db.commit()
    db.refresh(new_order)

    # 5. Crear la Preferencia de Pago en MercadoPago
    
    # URL pública base de tu backend (Si usas ngrok reemplaza aquí, ej: "https://tudominio.ngrok.app")
    # Es necesario para que MercadoPago pueda enviar la notificación del pago.
    public_url = os.getenv("PUBLIC_URL", "http://localhost:8000")
    
    preference_data = {
        "items": mp_items,
        "payer": {
            "email": current_user.email
        },
        "back_urls": {
            "success": "http://localhost:4200/orders",
            "failure": "http://localhost:4200/cart",
            "pending": "http://localhost:4200/orders"
        },
        "auto_return": "approved",
        "external_reference": str(new_order.id),
        "notification_url": f"{public_url}/orders/webhook"
    }

    try:
        preference_response = sdk.preference().create(preference_data)
        
        if preference_response.get("status") in [200, 201]:
            preference = preference_response.get("response", {})
            init_point = preference.get("init_point")
        else:
            # Si hay un error, lo enviamos al FrontEnd para saber exactamente qué pasó
            mp_error = preference_response.get("response", {}).get("message", "Error desconocido de MercadoPago")
            raise HTTPException(status_code=400, detail=f"MP Error: {mp_error}")
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Error al generar mercado pago: {str(e)}")

    # Agregamos el enlace al response (ya soportado en el schema)
    from fastapi.encoders import jsonable_encoder
    response_data = jsonable_encoder(new_order)
    
    # Extraemos manualmente para coincidir con Schema de pydantic
    order_res = OrderResponse.model_validate(new_order)
    order_res.init_point = init_point
    return order_res

@router.get("/my-orders", response_model=List[OrderResponse])
def get_my_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()

@router.post("/webhook")
async def mercadopago_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Ruta para recibir las notificaciones (Webhooks/IPN) de MercadoPago.
    Se actualiza automáticamente el estado de la orden en la BD.
    """
    try:
        # Obtener los datos como JSON o por query parameters
        data = await request.json()
        action = data.get("action")
        payment_id = data.get("data", {}).get("id")
    except Exception:
        # Modo IPN (x-www-form-urlencoded) u otro modo 
        action = request.query_params.get("topic") or request.query_params.get("type")
        payment_id = request.query_params.get("id") or request.query_params.get("data.id")
    
    if action in ["payment.created", "payment.updated", "payment"] and payment_id:
        try:
            # Consultamos la API de MercadoPago con el ID de pago recibido
            payment_info = sdk.payment().get(payment_id)
            if payment_info.get("status") == 200:
                payment_data = payment_info["response"]
                
                payment_status = payment_data.get("status")
                external_reference = payment_data.get("external_reference") # Aquí viene nuestro Order ID
                
                if external_reference and external_reference.isdigit():
                    order_id = int(external_reference)
                    order = db.query(Order).filter(Order.id == order_id).first()
                    
                    if order:
                        # Si el pago es aprobado, marcamos la orden como procesando
                        if payment_status == "approved":
                            order.status = OrderStatusEnum.procesando
                        elif payment_status in ["rejected", "cancelled"]:
                            order.status = OrderStatusEnum.cancelado
                            
                        db.commit()
                        print(f"✅ Webhook: Orden {order_id} actualizada a {order.status.value}")
        except Exception as e:
            print(f"⚠️ Error procesando webhook de MP: {e}")
            
    return {"status": "success"}