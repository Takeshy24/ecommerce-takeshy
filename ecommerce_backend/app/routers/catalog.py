from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.catalog import Product, Category
from app.schemas.catalog import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    PaginatedProductResponse,
    CategoryResponse,
)
from typing import List
from app.core.security import get_current_user
from app.models.user import User, RoleEnum
from pathlib import Path
from uuid import uuid4
import shutil

router = APIRouter(prefix="/catalog", tags=["Catalog"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "products"
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024


def _build_public_image_url(request: Request, relative_path: str) -> str:
    return f"{str(request.base_url).rstrip('/')}{relative_path}"


def _save_uploaded_image(image: UploadFile) -> str:
    file_ext = Path(image.filename or "").suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Formato de imagen no permitido. Usa jpg, jpeg, png, webp o gif.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid4().hex}{file_ext}"
    target_path = UPLOAD_DIR / file_name

    with target_path.open("wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    file_size = target_path.stat().st_size
    if file_size > MAX_IMAGE_SIZE_BYTES:
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail="La imagen excede el tamaño máximo permitido de 5 MB.",
        )

    return f"/uploads/products/{file_name}"


def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
    return current_user


@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name.asc()).all()


@router.post("/products/upload-image")
def upload_product_image(
    request: Request,
    image: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo enviado no es una imagen válida.")

    relative_path = _save_uploaded_image(image)
    image.file.close()
    return {"image_url": _build_public_image_url(request, relative_path)}

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    # Validar que la categoría exista
    category = db.query(Category).filter(Category.id == product.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    new_product = Product(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.get("/products", response_model=PaginatedProductResponse)
def get_products(
    skip: int = Query(0, ge=0, description="Registros a omitir"),
    limit: int = Query(20, ge=1, le=500, description="Límite de registros por página"),
    db: Session = Depends(get_db)
):
    total = db.query(Product).count()
    products = db.query(Product).offset(skip).limit(limit).all()
    
    return {"total": total, "items": products}


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    for field, value in payload.model_dump().items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(product)
    db.commit()