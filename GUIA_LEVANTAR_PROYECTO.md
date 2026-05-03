# Guía para levantar el proyecto en otra máquina

Esta guía está pensada para levantar el proyecto completo (backend + frontend) en entorno local.

## 1. Requisitos previos

Instala estas herramientas:

- Python 3.10 o 3.11
- Node.js 20+ y npm
- PostgreSQL 14+
- Git

Verifica versiones:

```bash
python --version
node --version
npm --version
psql --version
```

## 2. Clonar el proyecto

```bash
git clone <URL_DEL_REPO>
cd LAB_02_TAKESHY
```

## 3. Levantar Backend (FastAPI)

## 3.1 Crear base de datos en PostgreSQL

Abre psql (o PgAdmin) y crea la base:

```sql
CREATE DATABASE ecommerce_db;
```

## 3.2 Configurar conexión de base de datos

Revisa y ajusta la cadena en este archivo:

- [ecommerce_backend/app/database.py](ecommerce_backend/app/database.py)

Actualmente usa este formato:

```python
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:2005@localhost/ecommerce_db"
```

Si tu usuario o contraseña son distintos, edítalo.

## 3.3 Crear entorno virtual e instalar dependencias

Desde la carpeta [ecommerce_backend](ecommerce_backend):

Windows (PowerShell):

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Windows (CMD):

```bash
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

Linux/Mac:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 3.4 Cargar datos iniciales (seed)

```bash
python seed.py
```

Credenciales iniciales esperadas:

- Admin: admin@tienda.com / Admin123!
- Cliente: ana@tienda.com / Cliente123!

## 3.5 Ejecutar API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Prueba rápida:

- [http://localhost:8000](http://localhost:8000)
- [http://localhost:8000/docs](http://localhost:8000/docs)

## 3.6 Nota sobre imágenes de productos

Las imágenes subidas desde el panel admin se guardan dentro del proyecto backend en:

- [ecommerce_backend/uploads/products](ecommerce_backend/uploads/products)

Y se exponen por FastAPI bajo la ruta:

- /uploads/...

## 4. Levantar Frontend (Angular)

Desde la carpeta [ecommerce_frontend](ecommerce_frontend):

## 4.1 Instalar dependencias

```bash
npm install
```

## 4.2 Verificar URL del backend

Revisa:

- [ecommerce_frontend/src/environments/environment.ts](ecommerce_frontend/src/environments/environment.ts)

Debe apuntar a:

```ts
apiUrl: 'http://localhost:8000'
```

## 4.3 Ejecutar frontend

Modo normal:

```bash
npm start
```

Modo estable (sin HMR), recomendado si aparece error visual raro en caliente:

```bash
npm run start:stable
```

Abrir en navegador:

- [http://localhost:4200](http://localhost:4200)

## 5. Orden recomendado de arranque

1. Iniciar PostgreSQL.
2. Levantar backend en puerto 8000.
3. Levantar frontend en puerto 4200.
4. Iniciar sesión y probar flujo.

## 6. Comprobación rápida funcional

1. Login como admin.
2. Ir a Admin > Productos.
3. Crear o editar un producto y subir imagen desde archivo.
4. Ir a Catálogo y verificar que se vea imagen, precio y botón de carrito.

## 7. Problemas comunes

## 7.1 Error de conexión a BD

- Verifica usuario/clave/base en [ecommerce_backend/app/database.py](ecommerce_backend/app/database.py).
- Confirma que PostgreSQL está encendido y escuchando en localhost.

## 7.2 CORS bloquea peticiones

El backend permite por defecto:

- http://localhost:4200

Si frontend corre en otro puerto, agrega ese origen en:

- [ecommerce_backend/app/main.py](ecommerce_backend/app/main.py)

## 7.3 Puerto 4200 ocupado

- Cierra procesos previos de Angular, o
- levanta en otro puerto:

```bash
npm start -- --port 4300
```

Si cambias puerto, recuerda ajustar CORS en backend.

## 7.4 Se ve en blanco por recarga caliente

Usa modo estable:

```bash
npm run start:stable
```
