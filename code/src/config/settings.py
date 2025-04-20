# Configuraciones globales para el sistema de modelos

from pathlib import Path
from dataclasses import dataclass

# Rutas base
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "src" / "data"

@dataclass
class ModelConfig:
    """Configuración base para modelos"""
    batch_size: int = 32
    test_size: float = 0.2
    validation_size: float = 0.2
    random_state: int = 42
    n_jobs: int = -1
    verbose: int = 1

@dataclass
class RiesgoCardiovascularConfig(ModelConfig):
    """Configuración específica para modelos de riesgo cardiovascular"""
    # Rutas específicas
    model_output_path: Path = MODELS_DIR / "r_cardio"
    # Parámetros específicos
    cv_folds: int = 5
    threshold: float = 0.5
    
@dataclass
class HospitalizacionConfig(ModelConfig):
    """Configuración específica para modelos de hospitalización"""
    model_output_path: Path = MODELS_DIR / "hospitalization"
    
@dataclass
class AsistenciaConfig(ModelConfig):
    """Configuración específica para modelos de asistencia"""
    model_output_path: Path = MODELS_DIR / "asistencias"

@dataclass
class FlujoAtencionConfig(ModelConfig):
    """Configuración específica para modelos de flujo de atención"""
    model_output_path: Path = MODELS_DIR / "flujo_pacientes"