# Punto de entrada principal para la API

from fastapi import FastAPI, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from pathlib import Path
import sys
import time

# Añadir directorio raiz al path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Importar configuración centralizada
from api.core.classes.configuracion import settings

# Importar rutas y middlewares
from api.core.routes import riesgo_cv
from api.core.middlewares.excepcion import ExcepcionMiddleware
from api.core.middlewares.perfilado import PerfiladoMiddleware

# Crear aplicación
app = FastAPI(
    title="API de Predicción Médica",
    description="API para predicción de riesgo cardiovascular y otros indicadores médicos",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Añadir middlewares personalizados
app.add_middleware(ExcepcionMiddleware)
if settings.ENABLE_PROFILING:
    app.add_middleware(PerfiladoMiddleware)

# Conectar a la base de datos
from api.core.data.db_connector import db_connector
from api.core.classes.tables import Base

@app.on_event("startup")
def setup_database():
    # Verificar que los modelos existen
    from pathlib import Path
    model_path = Path(__file__).parent / "models" / "r_cardio"
    if not model_path.exists() or not list(model_path.glob("*.pkl")):
        import logging
        logger = logging.getLogger("api")
        logger.warning(f"No se encontraron modelos en {model_path}. Buscando en ubicación alternativa...")
        
        # Intentar copiar desde code/models si existen
        try:
            from api.utils.update_models import copy_models
            copy_models()
        except Exception as e:
            logger.error(f"Error al copiar modelos: {str(e)}")
    
    # Conectar a base de datos
    if db_connector.connect():
        # Establecer el Base correcto
        db_connector.Base = Base
        # Crear tablas si no existen
        db_connector.create_tables()

# Añadir rutas
from api.core.routes import autenticacion
app.include_router(riesgo_cv.router)
app.include_router(autenticacion.router)

# Ruta principal
@app.get("/", status_code=status.HTTP_200_OK)
async def health_check():
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "online",
            "service": "API de Predicción Médica",
            "version": "1.0.0"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)