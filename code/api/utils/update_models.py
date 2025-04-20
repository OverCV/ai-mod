# Actualiza modelos desde code/models a api/models

import os
import shutil
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('update_models')

def copy_models():
    # Obtener ruta absoluta del archivo actual
    current_file = Path(__file__).resolve()
    # Api base es el directorio padre del directorio padre del directorio actual
    api_base = current_file.parent.parent
    # Code base es el directorio padre de api_base
    code_base = api_base.parent
    
    # Rutas correctas
    source_dir = code_base / "models"
    target_dir = api_base / "models"
    
    # Debug info
    print(f"Copiando de: {source_dir} a {target_dir}")
    
    # Crear directorio destino si no existe
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Verificar directorio fuente
    if not source_dir.exists():
        logger.error(f"El directorio fuente {source_dir} no existe")
        return False
    
    # Copiar cada carpeta de modelo
    model_types = [d for d in source_dir.iterdir() if d.is_dir()]
    for model_type in model_types:
        target_model_dir = target_dir / model_type.name
        target_model_dir.mkdir(parents=True, exist_ok=True)
        
        # Copiar archivos de modelos
        files_copied = 0
        for src_file in model_type.glob("*.*"):
            dest_file = target_model_dir / src_file.name
            try:
                shutil.copy2(src_file, dest_file)
                files_copied += 1
                logger.info(f"Copiado: {src_file} -> {dest_file}")
            except Exception as e:
                logger.error(f"Error al copiar {src_file}: {str(e)}")
        
        logger.info(f"Copiados {files_copied} archivos para {model_type.name}")
    
    return True

if __name__ == "__main__":
    logger.info("Iniciando actualización de modelos...")
    success = copy_models()
    if success:
        logger.info("Actualización completada con éxito")
    else:
        logger.error("La actualización falló")