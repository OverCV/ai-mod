from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Prediccion(Base):
    __tablename__ = "predicciones"
    
    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, index=True)
    campana_id = Column(Integer, index=True, nullable=True)
    tipo = Column(String, index=True)  # RIESGO_CV|ASISTENCIA|HOSPITALIZACION|REHOSPITALIZACION
    valor_prediccion = Column(Float)  # 0-100%
    confianza = Column(Float)  # 0-100%
    factores_influyentes = Column(JSON)
    fecha_prediccion = Column(Date, default=datetime.now().date())
    modelo_version = Column(String)
    
    def to_dict(self):
        return {
            "id": self.id,
            "paciente_id": self.paciente_id,
            "campana_id": self.campana_id,
            "tipo": self.tipo,
            "valor_prediccion": self.valor_prediccion,
            "confianza": self.confianza,
            "factores_influyentes": self.factores_influyentes,
            "fecha_prediccion": self.fecha_prediccion.isoformat() if self.fecha_prediccion else None,
            "modelo_version": self.modelo_version
        }