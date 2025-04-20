# Esquemas de datos para predicción de riesgo cardiovascular

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict

class DatosClinicosRequest(BaseModel):
    edad: int = Field(..., ge=0, le=120, description="Edad del paciente en años")
    genero: int = Field(..., ge=0, le=1, description="Género (0: Femenino, 1: Masculino)")
    estatura: float = Field(..., ge=50, le=250, description="Estatura en centímetros")
    peso: float = Field(..., ge=20, le=300, description="Peso en kilogramos")
    presion_sistolica: int = Field(..., ge=70, le=250, description="Presión sistólica (mmHg)")
    presion_diastolica: int = Field(..., ge=40, le=150, description="Presión diastólica (mmHg)")
    colesterol: int = Field(..., ge=1, le=3, description="Nivel de colesterol (1:Normal, 2:Elevado, 3:Alto)")
    glucosa: int = Field(..., ge=1, le=3, description="Nivel de glucosa (1:Normal, 2:Elevado, 3:Alto)")
    tabaco: int = Field(..., ge=0, le=1, description="Consumo de tabaco (0:No, 1:Sí)")
    alcohol: int = Field(..., ge=0, le=1, description="Consumo de alcohol (0:No, 1:Sí)")
    act_fisica: int = Field(..., ge=0, le=1, description="Actividad física regular (0:No, 1:Sí)")
    
    @model_validator(mode='after')
    def validar_presion(self):
        if self.presion_sistolica <= self.presion_diastolica:
            raise ValueError('La presión sistólica debe ser mayor que la diastólica')
        return self
    
    model_config = {"json_schema_extra": {
        "example": {
            "edad": 50,
            "genero": 1,
            "estatura": 170,
            "peso": 75.5,
            "presion_sistolica": 130,
            "presion_diastolica": 85,
            "colesterol": 2,
            "glucosa": 1,
            "tabaco": 0,
            "alcohol": 0,
            "act_fisica": 1
        }
    }}

class RiesgoCvPrediction(BaseModel):
    probabilidad: float = Field(..., ge=0, le=1, description="Probabilidad de riesgo cardiovascular")
    riesgo: bool = Field(..., description="Predicción de riesgo cardiovascular")
    nivel_riesgo: str = Field(..., description="Nivel de riesgo (Bajo, Moderado, Alto)")
    factores_principales: List[Dict[str, float]] = Field(..., description="Factores que más influyeron en la predicción")
    recomendaciones: List[str] = Field(..., description="Recomendaciones basadas en factores de riesgo")
    
    model_config = {"json_schema_extra": {
        "example": {
            "probabilidad": 0.72,
            "riesgo": True,
            "nivel_riesgo": "Alto",
            "factores_principales": [
                {"imc": 0.31},
                {"presion_sistolica": 0.25},
                {"edad": 0.18}
            ],
            "recomendaciones": [
                "Consulte a su médico para una evaluación completa",
                "Considere reducir la ingesta de sal para controlar la presión arterial",
                "Se recomienda actividad física regular moderada"
            ]
        }
    }}
