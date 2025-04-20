import requests
import json
import sys
import subprocess
import time
import os
from pathlib import Path

# Base URL para la API
BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    """Prueba el endpoint de salud de la API"""
    response = requests.get(f"{BASE_URL}/")
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_model_info():
    """Prueba el endpoint de información del modelo"""
    response = requests.get(f"{BASE_URL}/riesgo-cardiovascular/info")
    print(f"Status code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_prediction():
    """Prueba el endpoint de predicción"""
    test_data = {
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
    
    response = requests.post(f"{BASE_URL}/riesgo-cardiovascular/predecir", json=test_data)
    print(f"Status code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def start_api_server():
    """Inicia el servidor API en un proceso separado"""
    api_dir = Path(__file__).parent.parent / "api"
    env_path = api_dir / ".env" / "api.env"
    
    # Verificar que existe el archivo run.py
    run_script = api_dir / "run.py"
    if not run_script.exists():
        print(f"ERROR: No se encontró el script {run_script}")
        return None
    
    # Iniciar el servidor
    os.chdir(api_dir.parent)  # Cambiar al directorio code/
    cmd = [sys.executable, str(run_script)]
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Esperar a que el servidor esté listo
        print("Esperando a que el servidor API esté listo...")
        time.sleep(5)
        
        return process
    except Exception as e:
        print(f"Error al iniciar el servidor API: {e}")
        return None

def main():
    # Iniciar el servidor API
    server_process = start_api_server()
    if not server_process:
        print("No se pudo iniciar el servidor API. Abortando pruebas.")
        return
    
    try:
        # Ejecutar pruebas
        print("\n===== Prueba de endpoint de salud =====")
        health_ok = test_health_endpoint()
        
        print("\n===== Prueba de información del modelo =====")
        info_ok = test_model_info()
        
        print("\n===== Prueba de predicción =====")
        prediction_ok = test_prediction()
        
        # Resumen
        print("\n===== Resumen de pruebas =====")
        print(f"Endpoint de salud: {'OK' if health_ok else 'FALLO'}")
        print(f"Información del modelo: {'OK' if info_ok else 'FALLO'}")
        print(f"Predicción: {'OK' if prediction_ok else 'FALLO'}")
        
    finally:
        # Terminar el servidor
        print("\nDeteniendo el servidor API...")
        server_process.terminate()
        server_process.wait(timeout=5)

if __name__ == "__main__":
    main()