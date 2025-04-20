# Prueba para API de riesgo cardiovascular

import pytest
import sys
import os
from pathlib import Path
import json
from fastapi.testclient import TestClient

# Añadir directorio raiz al path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from api.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_model_info(client):
    response = client.get("/riesgo-cardiovascular/info")
    assert response.status_code == 200
    assert "modelo" in response.json()
    assert "caracteristicas" in response.json()

def test_predecir_riesgo_valido(client):
    datos_prueba = {
        "edad": 50,
        "genero": 1,
        "estatura": 170,
        "peso": 80,
        "presion_sistolica": 140,
        "presion_diastolica": 90,
        "colesterol": 2,
        "glucosa": 1,
        "tabaco": 1,
        "alcohol": 0,
        "act_fisica": 0
    }
    
    response = client.post("/riesgo-cardiovascular/predecir", json=datos_prueba)
    assert response.status_code == 200
    assert "probabilidad" in response.json()
    assert "riesgo" in response.json()
    assert "nivel_riesgo" in response.json()
    assert "factores_principales" in response.json()
    assert "recomendaciones" in response.json()

def test_predecir_riesgo_invalido(client):
    # Datos incorrectos (presión sistólica < diastólica)
    datos_prueba = {
        "edad": 50,
        "genero": 1,
        "estatura": 170,
        "peso": 80,
        "presion_sistolica": 80,  # Valor incorrecto
        "presion_diastolica": 90,
        "colesterol": 2,
        "glucosa": 1,
        "tabaco": 1,
        "alcohol": 0,
        "act_fisica": 0
    }
    
    response = client.post("/riesgo-cardiovascular/predecir", json=datos_prueba)
    assert response.status_code == 422
    assert "detail" in response.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("test_api_riesgo_cv:app", host="0.0.0.0", port=8001, reload=True)