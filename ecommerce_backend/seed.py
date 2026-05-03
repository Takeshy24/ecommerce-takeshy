import random
from datetime import datetime, timedelta

from app.core.security import get_password_hash
from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.cart import Cart
from app.models.catalog import Category, Product
from app.models.order import Order, OrderItem, OrderStatusEnum
from app.models.user import RoleEnum, User


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Iniciando seeding...")

        admin = db.query(User).filter(User.email == "admin@tienda.com").first()
        if not admin:
            admin = User(
                email="admin@tienda.com",
                hashed_password=get_password_hash("Admin123!"),
                full_name="Takeshy Admin",
                role=RoleEnum.admin,
            )
            db.add(admin)

        client_specs = [
            ("ana@tienda.com", "Ana Ruiz"),
            ("bruno@tienda.com", "Bruno Campos"),
            ("carla@tienda.com", "Carla Silva"),
            ("diego@tienda.com", "Diego Soto"),
            ("elena@tienda.com", "Elena Mena"),
        ]
        for email, full_name in client_specs:
            exists = db.query(User).filter(User.email == email).first()
            if not exists:
                db.add(
                    User(
                        email=email,
                        hashed_password=get_password_hash("Cliente123!"),
                        full_name=full_name,
                        role=RoleEnum.cliente,
                    )
                )

        db.commit()

        category_specs = [
            ("Tecnologia", "Equipos, perifericos y gadgets"),
            ("Ropa", "Moda urbana y deportiva"),
            ("Hogar", "Articulos para casa y cocina"),
            ("Deportes", "Implementos para entrenamiento"),
            ("Libros", "Lectura tecnica y recreativa"),
        ]

        for name, description in category_specs:
            exists = db.query(Category).filter(Category.name == name).first()
            if not exists:
                db.add(Category(name=name, description=description))

        db.commit()
        categories = {cat.name: cat for cat in db.query(Category).all()}

        product_specs = [
            ("Laptop Gamer Pro", "RTX 4060, 16GB RAM, SSD 1TB", 4899.00, 20, "Tecnologia"),
            ("Teclado Mecanico RGB", "Switches red, formato 75%", 229.00, 55, "Tecnologia"),
            ("Mouse Inalambrico", "Sensor optico 20000 DPI", 139.00, 60, "Tecnologia"),
            ("Monitor 27 IPS", "2K, 165Hz para gaming", 1199.00, 15, "Tecnologia"),
            ("Camisa Premium", "Algodon organico talla regular", 79.90, 80, "Ropa"),
            ("Casaca Impermeable", "Tela ligera para lluvia", 149.90, 34, "Ropa"),
            ("Zapatillas Running", "Suela EVA y soporte lateral", 259.90, 26, "Ropa"),
            ("Set Ollas Acero", "Bateria de 6 piezas", 329.00, 22, "Hogar"),
            ("Licuadora 1200W", "Jarra de vidrio templado", 289.00, 19, "Hogar"),
            ("Aspiradora Compacta", "Filtro HEPA y 2 boquillas", 419.00, 12, "Hogar"),
            ("Mancuernas Ajustables", "Par 5-20kg", 499.00, 11, "Deportes"),
            ("Mat de Yoga", "Antideslizante 6mm", 89.00, 47, "Deportes"),
            ("Bicicleta Estatica", "Resistencia magnetica", 1299.00, 7, "Deportes"),
            ("Clean Code", "Robert C. Martin", 99.00, 50, "Libros"),
            ("Arquitectura Limpia", "Practicas de diseno de software", 109.00, 42, "Libros"),
            ("Refactoring", "Martin Fowler, segunda edicion", 119.00, 37, "Libros"),
        ]

        for name, description, price, stock, category_name in product_specs:
            exists = db.query(Product).filter(Product.name == name).first()
            if exists:
                continue

            db.add(
                Product(
                    name=name,
                    description=description,
                    price=price,
                    stock=stock,
                    category_id=categories[category_name].id,
                )
            )

        db.commit()

        clients = db.query(User).filter(User.role == RoleEnum.cliente).all()
        for client in clients:
            has_cart = db.query(Cart).filter(Cart.user_id == client.id).first()
            if not has_cart:
                db.add(Cart(user_id=client.id))

        db.commit()

        current_orders = db.query(Order).count()
        target_orders = 30
        if current_orders < target_orders:
            products = db.query(Product).all()
            orders_to_create = target_orders - current_orders

            for _ in range(orders_to_create):
                user = random.choice(clients)
                created_at = datetime.utcnow() - timedelta(days=random.randint(1, 90))
                status = random.choice([
                    OrderStatusEnum.pendiente,
                    OrderStatusEnum.procesando,
                    OrderStatusEnum.enviado,
                    OrderStatusEnum.entregado,
                    OrderStatusEnum.cancelado,
                ])

                items_count = random.randint(1, 4)
                selected_products = random.sample(products, k=min(items_count, len(products)))

                order_items = []
                subtotal = 0.0
                for product in selected_products:
                    quantity = random.randint(1, 3)
                    line_subtotal = quantity * float(product.price)
                    subtotal += line_subtotal
                    order_items.append(
                        OrderItem(
                            product_id=product.id,
                            quantity=quantity,
                            unit_price=float(product.price),
                        )
                    )

                tax = round(subtotal * 0.18, 2)
                total = round(subtotal + tax, 2)

                db.add(
                    Order(
                        user_id=user.id,
                        status=status,
                        subtotal=round(subtotal, 2),
                        tax=tax,
                        total=total,
                        created_at=created_at,
                        items=order_items,
                    )
                )

            db.commit()

        print("Seeding completado.")
        print("Credenciales admin: admin@tienda.com / Admin123!")
        print("Credenciales cliente: ana@tienda.com / Cliente123!")

    except Exception as exc:
        db.rollback()
        print(f"Error durante el seeding: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
