import subprocess
import os
import time
import sys
import signal
import requests
import json

API_PROCESS = None
API_URL = "http://localhost:8000"

def start_api():
    global API_PROCESS
    print("Iniciando API en segundo plano...")
    try:
        api_dir = os.path.join(os.getcwd(), "code")
        env_path = os.path.join(api_dir, ".venv", "Scripts", "activate.bat")
        
        if not os.path.exists(env_path):
            print(f"Error: No se encontró entorno virtual en {env_path}")
            return False
        
        cmd = f"cd {api_dir} && {env_path} && python api/run.py"
        API_PROCESS = subprocess.Popen(
            cmd, 
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
        print(f"API iniciada con PID {API_PROCESS.pid}")
        
        # Esperar a que la API esté disponible
        for _ in range(10):
            try:
                response = requests.get(f"{API_URL}/")
                if response.status_code == 200:
                    print(f"API disponible: {response.json()}")
                    return True
            except:
                pass
            print("Esperando a que la API esté disponible...")
            time.sleep(2)
        
        print("Error: No se pudo conectar con la API")
        return False
    except Exception as e:
        print(f"Error al iniciar API: {e}")
        return False

def stop_api():
    global API_PROCESS
    if API_PROCESS:
        print(f"Deteniendo API (PID {API_PROCESS.pid})...")
        try:
            if os.name == 'nt':
                # Windows
                os.kill(API_PROCESS.pid, signal.CTRL_BREAK_EVENT)
            else:
                # Linux/Mac
                os.killpg(os.getpgid(API_PROCESS.pid), signal.SIGTERM)
            
            # Esperar a que termine
            for _ in range(5):
                if API_PROCESS.poll() is not None:
                    break
                time.sleep(0.5)
            
            # Forzar cierre si no ha terminado
            if API_PROCESS.poll() is None:
                API_PROCESS.terminate()
            
            print("API detenida")
        except Exception as e:
            print(f"Error al detener API: {e}")

def test_endpoints():
    try:
        # 1. Verificar estado
        print("\n1. Probando endpoint de estado...")
        response = requests.get(f"{API_URL}/")
        print(f"Estado: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        # 2. Verificar info del modelo
        print("\n2. Probando endpoint de info del modelo...")
        response = requests.get(f"{API_URL}/riesgo-cardiovascular/info")
        print(f"Info modelo: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        # 3. Probar predicción
        print("\n3. Probando endpoint de predicción...")
        data = {
            "edad": 55,
            "genero": 1,
            "estatura": 170,
            "peso": 90,
            "presion_sistolica": 150,
            "presion_diastolica": 95,
            "colesterol": 3,
            "glucosa": 2,
            "tabaco": 1,
            "alcohol": 1,
            "act_fisica": 0
        }
        response = requests.post(f"{API_URL}/riesgo-cardiovascular/predecir", json=data)
        print(f"Predicción: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
        return True
    except Exception as e:
        print(f"Error en pruebas: {e}")
        return False

def run_all_tests():
    print("=== Iniciando pruebas del sistema de predicción cardiovascular ===")
    
    # Iniciar API
    api_started = start_api()
    if not api_started:
        print("No se pudo iniciar la API. Abortando pruebas.")
        return False
    
    try:
        # Probar endpoints
        tests_passed = test_endpoints()
        if tests_passed:
            print("\n✅ Todas las pruebas completadas exitosamente")
        else:
            print("\n❌ Algunas pruebas fallaron")
        
        return tests_passed
    finally:
        # Siempre detener la API al finalizar
        stop_api()

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)