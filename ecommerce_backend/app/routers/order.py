from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Any, List
import logging
import os
import mercadopago

logger = logging.getLogger(__name__)

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


def _strip_env_url(raw: str) -> str:
    """Evita fallos típicos al pegar URLs en Render/Vercel (comillas, espacios, BOM)."""
    s = (raw or "").strip().strip("\ufeff")
    if len(s) >= 2 and s[0] == s[-1] and s[0] in {'"', "'"}:
        s = s[1:-1].strip()
    return s.rstrip("/")


def _format_mp_error_payload(resp_body: dict[str, Any] | None) -> str:
    if not isinstance(resp_body, dict):
        return "Error desconocido de MercadoPago"
    parts: list[str] = []
    msg = resp_body.get("message")
    if isinstance(msg, str):
        parts.append(msg)
    for item in resp_body.get("cause") or []:
        if isinstance(item, dict) and isinstance(item.get("description"), str):
            parts.append(item["description"])
        elif isinstance(item, str):
            parts.append(item)
    extra = "; ".join(p for p in parts if p)
    # Compatibilidad si solo hay message anidado
    return extra if extra else str(resp_body)


def _require_https_base_url(env_name: str) -> str:
    """Mercado Pago rechaza http:// en back_urls (vigente desde mar-2025)."""
    raw = _strip_env_url(os.getenv(env_name) or "")
    if not raw:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Configura {env_name} con la URL pública HTTPS de tu frontend "
                "(ej. https://tu-app.vercel.app). MP ya no acepta http:// en back_urls."
            ),
        )
    if not raw.lower().startswith("https://"):
        raise HTTPException(
            status_code=500,
            detail=f"{env_name} debe usar https:// — Mercado Pago bloquea HTTP en preferencias.",
        )
    return raw


def _optional_https_base_url(env_name: str) -> str | None:
    raw = _strip_env_url(os.getenv(env_name) or "")
    if not raw:
        return None
    if not raw.lower().startswith("https://"):
        raise HTTPException(
            status_code=500,
            detail=f"Si defines {env_name}, debe ser https:// (requerido por Mercado Pago para webhooks).",
        )
    return raw


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
            "quantity": int(cart_item.quantity),
            "unit_price": round(float(product.price), 2),
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
    # FRONTEND_PUBLIC_URL: URL HTTPS del sitio (Vercel, etc.). Sin esto MP devuelve error por auto_return/back_urls.
    # PUBLIC_URL (opcional): URL HTTPS del backend para webhooks; si falta, no se envía notification_url.
    frontend_base = _require_https_base_url("FRONTEND_PUBLIC_URL")
    public_backend = _optional_https_base_url("PUBLIC_URL")

    def _join_frontend(path: str) -> str:
        p = path if path.startswith("/") else f"/{path}"
        return f"{frontend_base}{p}"

    # auto_return exige validación más estricta de back_urls.success; si MP la rechaza, falla con "auto_return no válido..."
    auto_return_pref = (_strip_env_url(os.getenv("MP_AUTO_RETURN", "")) or "").lower()
    use_auto_return = auto_return_pref in ("approved", "1", "true", "yes", "si", "sí")

    preference_data = {
        "items": mp_items,
        "payer": {
            "email": current_user.email
        },
        "back_urls": {
            "success": _join_frontend("/orders"),
            "failure": _join_frontend("/cart"),
            "pending": _join_frontend("/orders"),
        },
        "external_reference": str(new_order.id),
    }
    if use_auto_return:
        preference_data["auto_return"] = "approved"
    if public_backend:
        preference_data["notification_url"] = f"{public_backend}/orders/webhook"

    try:
        preference_response = sdk.preference().create(preference_data)

        if preference_response.get("status") in [200, 201]:
            preference = preference_response.get("response", {})
            init_point = preference.get("init_point") or preference.get("sandbox_init_point")
        else:
            # Si hay un error, lo enviamos al FrontEnd para saber exactamente qué pasó
            body = preference_response.get("response")
            mp_error = _format_mp_error_payload(body if isinstance(body, dict) else None)
            logger.warning("MercadoPago preference error: status=%s body=%s url_success=%s", preference_response.get("status"), body, preference_data.get("back_urls", {}).get("success"))
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