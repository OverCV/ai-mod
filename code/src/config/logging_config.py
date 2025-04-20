# Configuración de logging para el sistema

import logging
import sys
from pathlib import Path

# Estructura básica para logging
def setup_logging(log_level=logging.INFO, log_file=None):
    """Configura el sistema de logging"""
    logger = logging.getLogger("medical_predictions")
    logger.setLevel(log_level)
    
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Handler de consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Handler de archivo si se especifica
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

# Logging específico para modelos
def get_model_logger(model_name):
    """Obtiene un logger específico para un modelo"""
    logger = logging.getLogger(f"medical_predictions.{model_name}")
    return logger