from pathlib import Path
import sys
import json

current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from api.core.classes.schemas.riesgo_cv import DatosClinicosRequest
from pydantic import ValidationError

def test_validacion_esquema():
    """Prueba directa de la validación del esquema de datos clínicos"""
    print("Probando validación de esquema de datos clínicos...")
    
    # 1. Caso válido
    try:
        print("\n1. Probando caso válido:")
        datos_validos = {
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
        validated = DatosClinicosRequest.model_validate(datos_validos)
        print(f"Validación exitosa: {validated}")
    except ValidationError as e:
        print(f"Error inesperado: {e}")
        return False
    
    # 2. Caso inválido: presión sistólica < diastólica
    try:
        print("\n2. Probando presión sistólica < diastólica:")
        datos_invalidos = {
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
        validated = DatosClinicosRequest.model_validate(datos_invalidos)
        print("Error: La validación debió fallar pero no lo hizo")
        return False
    except ValidationError as e:
        print(f"Validación falló correctamente: {e}")
    
    # 3. Caso inválido: edad negativa
    try:
        print("\n3. Probando edad negativa:")
        datos_invalidos = {
            "edad": -5,  # Valor incorrecto
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
        validated = DatosClinicosRequest.model_validate(datos_invalidos)
        print("Error: La validación debió fallar pero no lo hizo")
        return False
    except ValidationError as e:
        print(f"Validación falló correctamente: {e}")
    
    return True

if __name__ == "__main__":
    resultado = test_validacion_esquema()
    print(f"\nPrueba {'exitosa' if resultado else 'fallida'}!")
