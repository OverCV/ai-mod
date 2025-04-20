from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path
import dotenv

class Settings(BaseSettings):
    API_ENV: str = "development"
    ENABLE_PROFILING: bool = True
    
    # Configuraciones de servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    TIMEOUT: int = 60
    WORKERS: int = 4
    RELOAD: bool = True
    
    # URLs de servicios
    REACT_LOCAL_URL: str = "http://localhost:3000"
    SPRING_LOCAL_URL: str = "http://localhost:8090"
    REACT_REMOTE_URL: str = "https://next-front-8rds-hysh2bbjf-overcv1s-projects.vercel.app/"
    SPRING_REMOTE_URL: str = "https://spring-logic.onrender.com/api/"
    
    # Base de datos
    POSTGRE_REMOTE_URL: str = "postgresql://dev:npg_ZbH1MpwLv5VD@ep-wispy-surf-a8g50wx4-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
    
    # Modelos
    MODELS_DIR: str = "models"
    CACHE_PREDICTIONS: bool = True
    
    @property
    def is_prod(self) -> bool:
        return self.API_ENV.lower() in ["production", "prod"]
    
    @property
    def spring_api_url(self) -> str:
        return self.SPRING_REMOTE_URL if self.is_prod else self.SPRING_LOCAL_URL
    
    @property
    def react_url(self) -> str:
        return self.REACT_REMOTE_URL if self.is_prod else self.REACT_LOCAL_URL
    
    @property
    def db_url(self) -> str:
        return self.POSTGRE_REMOTE_URL  # Siempre usar remoto por ahora

def get_settings() -> Settings:
    # Cargar variables de entorno desde archivo
    env_path = Path(__file__).parent.parent.parent / ".env" / "api.env"
    if env_path.exists():
        dotenv.load_dotenv(dotenv_path=env_path)
    
    return Settings()

settings = get_settings()