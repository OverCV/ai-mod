from pathlib import Path
import sys
import json

current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_info_modelo():
    """Prueba el endpoint de información del modelo"""
    response = client.get("/riesgo-cardiovascular/info")
    print(f"Status code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    assert response.status_code == 200
    assert "modelo" in response.json()
    assert "caracteristicas" in response.json()
    return True

def test_prediccion():
    """Prueba el endpoint de predicción de riesgo cardiovascular"""
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
    print(f"Status code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    assert response.status_code == 200
    assert "probabilidad" in response.json()
    assert "nivel_riesgo" in response.json()
    assert "factores_principales" in response.json()
    assert "recomendaciones" in response.json()
    return True

# Caso de prueba con datos no válidos
def test_validacion_datos():
    """Prueba la validación de datos en el endpoint de predicción"""
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
    print(f"Status code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    assert response.status_code == 422  # Unprocessable Entity
    return True

if __name__ == "__main__":
    print("\n1. Probando información del modelo...")
    test_info = test_info_modelo()
    
    print("\n2. Probando predicción de riesgo cardiovascular...")
    test_pred = test_prediccion()
    
    print("\n3. Probando validación de datos incorrectos...")
    test_val = test_validacion_datos()
    
    print(f"\nResumen de pruebas:")
    print(f"- Información del modelo: {'Exitosa' if test_info else 'Fallida'}")
    print(f"- Predicción de riesgo: {'Exitosa' if test_pred else 'Fallida'}")
    print(f"- Validación de datos: {'Exitosa' if test_val else 'Fallida'}")
