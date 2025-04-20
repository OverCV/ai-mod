from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from api.core.classes.tables import Prediccion

class RepositorioPredicciones:
    def __init__(self, db: Session):
        self.db = db
    
    def crear_prediccion(self, datos: Dict[str, Any]) -> Prediccion:
        prediccion = Prediccion(**datos)
        self.db.add(prediccion)
        self.db.commit()
        self.db.refresh(prediccion)
        return prediccion
    
    def obtener_prediccion(self, prediccion_id: int) -> Optional[Prediccion]:
        return self.db.query(Prediccion).filter(Prediccion.id == prediccion_id).first()
    
    def obtener_predicciones_paciente(self, paciente_id: int, tipo: Optional[str] = None) -> List[Prediccion]:
        query = self.db.query(Prediccion).filter(Prediccion.paciente_id == paciente_id)
        if tipo:
            query = query.filter(Prediccion.tipo == tipo)
        return query.order_by(Prediccion.fecha_prediccion.desc()).all()
    
    def obtener_ultima_prediccion_paciente(self, paciente_id: int, tipo: str) -> Optional[Prediccion]:
        return self.db.query(Prediccion).filter(
            Prediccion.paciente_id == paciente_id,
            Prediccion.tipo == tipo
        ).order_by(Prediccion.fecha_prediccion.desc()).first()
    
    def actualizar_prediccion(self, prediccion_id: int, datos: Dict[str, Any]) -> Optional[Prediccion]:
        prediccion = self.obtener_prediccion(prediccion_id)
        if prediccion:
            for key, value in datos.items():
                setattr(prediccion, key, value)
            self.db.commit()
            self.db.refresh(prediccion)
        return prediccion