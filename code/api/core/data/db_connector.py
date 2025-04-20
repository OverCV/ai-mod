# Conector de base de datos para PostgreSQL

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from api.core.classes.configuracion import settings
import logging

logger = logging.getLogger("api")

class DatabaseConnector:
    def __init__(self, url=None):
        self.url = url or settings.db_url
        self.engine = None
        self.SessionLocal = None
        self.Base = declarative_base()
    
    def connect(self):
        try:
            self.engine = create_engine(
                self.url, 
                pool_size=10, 
                max_overflow=20,
                pool_recycle=3600,
                pool_pre_ping=True
            )
            self.SessionLocal = scoped_session(sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self.engine
            ))
            logger.info(f"Conexión establecida con la base de datos")
            return True
        except Exception as e:
            logger.error(f"Error al conectar con la base de datos: {str(e)}")
            return False
    
    def create_tables(self):
        try:
            self.Base.metadata.create_all(bind=self.engine)
            logger.info("Tablas creadas correctamente")
            return True
        except Exception as e:
            logger.error(f"Error al crear tablas: {str(e)}")
            return False
    
    def get_session(self):
        if not self.SessionLocal:
            self.connect()
        return self.SessionLocal()

db_connector = DatabaseConnector()

def get_db():
    db = db_connector.get_session()
    try:
        yield db
    finally:
        db.close()