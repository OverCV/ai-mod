import requests
import json
import sys
import time

API_URL = "http://localhost:8000"

# Test health endpoint
def test_health():
    response = requests.get(f"{API_URL}/")
    print(f"Health check: {response.status_code}")
    print(response.json())
    print()

# Test model info
def test_model_info():
    response = requests.get(f"{API_URL}/riesgo-cardiovascular/info")
    print(f"Model info: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    print()

# Test prediction
def test_prediction():
    data = {
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
    
    start_time = time.time()
    response = requests.post(f"{API_URL}/riesgo-cardiovascular/predecir", json=data)
    elapsed = time.time() - start_time
    
    print(f"Prediction: {response.status_code} - Time: {elapsed:.4f}s")
    print(json.dumps(response.json(), indent=2))
    print()

def main():
    print("\n===== Testing API =====\n")
    try:
        test_health()
        test_model_info()
        test_prediction()
        print("All tests completed successfully!")
    except Exception as e:
        print(f"Error testing API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()