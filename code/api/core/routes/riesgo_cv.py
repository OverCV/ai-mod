# Rutas para predicción de riesgo cardiovascular

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import Any, Dict, List, Optional
import os

from api.core.classes.schemas.riesgo_cv import DatosClinicosRequest, RiesgoCvPrediction
from api.core.services.riesgo_cv import ServicioRiesgoCardiovascular
from api.core.data.db_connector import get_db
from sqlalchemy.orm import Session
from api.core.classes.configuracion import settings
from api.core.repository.predicciones import RepositorioPredicciones

router = APIRouter(
    prefix="/riesgo-cardiovascular",
    tags=["riesgo-cardiovascular"],
    responses={404: {"description": "No encontrado"}},
)

@router.post("/predecir", response_model=RiesgoCvPrediction, status_code=status.HTTP_200_OK)
async def predecir_riesgo_cardiovascular(
    datos: DatosClinicosRequest,
    paciente_id: Optional[int] = Query(None, description="ID del paciente para guardar la predicción"),
    guardar_db: bool = Query(False, description="Guardar predicción en base de datos"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        servicio = ServicioRiesgoCardiovascular()
        resultado = servicio.predecir(
            datos=datos.dict(),
            paciente_id=paciente_id,
            guardar_db=guardar_db,
            db=db if guardar_db else None
        )
        return resultado
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en predicción: {str(e)} - {error_msg if settings.API_ENV == 'development' else ''}"
        )

@router.get("/info", status_code=status.HTTP_200_OK)
async def obtener_info_modelo() -> Dict[str, Any]:
    try:
        servicio = ServicioRiesgoCardiovascular()
        info = {
            "modelo": type(servicio.modelo).__name__,
            "caracteristicas": servicio.feature_names,
            "total_caracteristicas": len(servicio.feature_names),
            "ruta_modelo": str(servicio.model_path),
            "entorno": settings.API_ENV
        }
        return info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo info: {str(e)}"
        )

@router.get("/predicciones/{paciente_id}", status_code=status.HTTP_200_OK)
async def obtener_predicciones_paciente(
    paciente_id: int,
    tipo: Optional[str] = Query(None, description="Tipo de predicción: RIESGO_CV, ASISTENCIA, etc."),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    try:
        repo = RepositorioPredicciones(db)
        predicciones = repo.obtener_predicciones_paciente(paciente_id, tipo)
        return [pred.to_dict() for pred in predicciones]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo predicciones: {str(e)}"
        )

@router.get("/estado-salud/{paciente_id}", status_code=status.HTTP_200_OK)
async def obtener_estado_salud_paciente(
    paciente_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        repo = RepositorioPredicciones(db)
        prediccion_cv = repo.obtener_ultima_prediccion_paciente(paciente_id, "RIESGO_CV")
        
        resultado = {
            "paciente_id": paciente_id,
            "riesgo_cardiovascular": None,
            "hospitalizacion": None,
            "ultima_actualizacion": None
        }
        
        if prediccion_cv:
            resultado["riesgo_cardiovascular"] = {
                "valor": prediccion_cv.valor_prediccion / 100,  # Convertir a 0-1
                "nivel": "Bajo" if prediccion_cv.valor_prediccion < 30 else 
                         "Moderado" if prediccion_cv.valor_prediccion < 70 else "Alto",
                "fecha": prediccion_cv.fecha_prediccion.isoformat(),
                "factores": prediccion_cv.factores_influyentes
            }
            resultado["ultima_actualizacion"] = prediccion_cv.fecha_prediccion.isoformat()
            
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estado de salud: {str(e)}"
        )