from pathlib import Path
import sys
current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_info_modelo():
    response = client.get("/riesgo-cardiovascular/info")
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    
def test_prediccion():
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
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    assert "probabilidad" in response.json()
    assert "nivel_riesgo" in response.json()
    assert "factores_principales" in response.json()
    
if __name__ == "__main__":
    test_info_modelo()
    test_prediccion()
