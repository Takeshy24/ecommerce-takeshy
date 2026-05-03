from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.models import Base
from app.database import engine
from app.routers import auth, catalog, cart, order, admin_dashboard, reports, admin_orders

# Crear las tablas en la BD si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ecommerce API",
    description="Backend para el sistema de ecommerce",
    version="1.0.0"
)

uploads_path = Path(__file__).resolve().parents[1] / "uploads"
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Configurar CORS para que Angular pueda consumir la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir cualquier origen en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar todos los routers
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(cart.router)
app.include_router(order.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_orders.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"message": "Ecommerce API corriendo correctamente"}
