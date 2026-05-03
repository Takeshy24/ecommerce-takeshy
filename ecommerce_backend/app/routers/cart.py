from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.catalog import Product
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartResponse
# Asumimos que get_current_user extrae el usuario del token JWT
from app.core.security import get_current_user 

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("/", response_model=CartResponse)
def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Buscar o crear el carrito del usuario
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    items_response = []
    subtotal_general = 0.0

    for item in cart.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        item_subtotal = product.price * item.quantity
        subtotal_general += item_subtotal
        
        items_response.append({
            "id": item.id,
            "product_id": product.id,
            "quantity": item.quantity,
            "product_name": product.name,
            "unit_price": product.price,
            "subtotal": item_subtotal
        })

    tax = subtotal_general * 0.18 # Cálculo del IGV (18%)
    total = subtotal_general + tax

    return {
        "id": cart.id,
        "items": items_response,
        "subtotal_general": subtotal_general,
        "tax": tax,
        "total": total
    }

@router.post("/items", status_code=status.HTTP_201_CREATED)
def add_item_to_cart(
    item_in: CartItemCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    product = db.query(Product).filter(Product.id == item_in.product_id).first()
    
    if not product or product.stock < item_in.quantity:
        raise HTTPException(status_code=400, detail="Stock insuficiente o producto no válido")

    # Verificar si el producto ya está en el carrito para sumar la cantidad
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id, CartItem.product_id == item_in.product_id
    ).first()

    if existing_item:
        existing_item.quantity += item_in.quantity
    else:
        new_item = CartItem(cart_id=cart.id, product_id=item_in.product_id, quantity=item_in.quantity)
        db.add(new_item)
        
    db.commit()
    return {"message": "Producto agregado al carrito"}