# Script para iniciar la API usando uvicorn

import uvicorn
import os
from dotenv import load_dotenv
import sys
import logging
from pathlib import Path

# Configurar logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("api-starter")

# Cargar variables de entorno
env_path = Path(__file__).parent / ".env" / "api.env"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    logger.info(f"Variables de entorno cargadas desde {env_path}")
else:
    logger.warning(f"Archivo de variables de entorno no encontrado en {env_path}")

# Configuración
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
RELOAD = os.getenv("RELOAD", "true").lower() == "true"
WORKERS = int(os.getenv("WORKERS", 1))
TIMEOUT = int(os.getenv("TIMEOUT", 60))


def main():
    logger.info(f"Iniciando API en {HOST}:{PORT} (reload={RELOAD}, workers={WORKERS})")
    try:
        # Actualizar modelos antes de iniciar
        update_models()

        uvicorn.run(
            "api.main:app",
            host=HOST,
            port=PORT,
            reload=RELOAD,
            workers=WORKERS,
            timeout_keep_alive=TIMEOUT,
        )
    except Exception as e:
        logger.error(f"Error al iniciar la API: {str(e)}")
        sys.exit(1)


def update_models():
    try:
        from pathlib import Path
        import shutil

        # Directorios
        source_dir = Path("models/r_cardio")
        target_dir = Path("api/models/r_cardio")

        # Crear directorio destino si no existe
        target_dir.mkdir(parents=True, exist_ok=True)

        # Verificar directorio fuente
        if not source_dir.exists():
            logger.warning(f"El directorio fuente {source_dir} no existe")
            return

        # Copiar cada archivo
        for src_file in source_dir.glob("*.*"):
            dest_file = target_dir / src_file.name
            try:
                shutil.copy2(src_file, dest_file)
                logger.info(f"Copiado: {src_file.name}")
            except Exception as e:
                logger.error(f"Error al copiar {src_file}: {str(e)}")

        logger.info("Modelos actualizados correctamente")
    except Exception as e:
        logger.error(f"Error al actualizar modelos: {str(e)}")


if __name__ == "__main__":
    main()
