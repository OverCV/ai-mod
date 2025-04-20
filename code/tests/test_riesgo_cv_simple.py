from pathlib import Path
import sys
import json

current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from api.core.services.riesgo_cv import ServicioRiesgoCardiovascular

def probar_prediccion():
    """Prueba la predicción de riesgo cardiovascular con datos de prueba"""
    print("Iniciando prueba de predicción simple...")
    
    try:
        # Datos de prueba
        datos_paciente = {
            "edad": 50,
            "genero": 1,  # Masculino
            "estatura": 170,
            "peso": 80,
            "presion_sistolica": 140,
            "presion_diastolica": 90,
            "colesterol": 2,  # Elevado
            "glucosa": 1,     # Normal
            "tabaco": 1,      # Sí
            "alcohol": 0,      # No
            "act_fisica": 0    # No
        }
        
        # Realizar predicción
        servicio = ServicioRiesgoCardiovascular()
        resultado_prediccion = servicio.predecir(
            datos=datos_paciente, 
            paciente_id=None, 
            guardar_db=False, 
            db=None
        )
        
        print("\nResultado de predicción:")
        print(json.dumps(resultado_prediccion, indent=2, ensure_ascii=False))
        
        # Verificar contenido del resultado
        assert "probabilidad" in resultado_prediccion
        assert "riesgo" in resultado_prediccion
        assert "nivel_riesgo" in resultado_prediccion
        assert "factores_principales" in resultado_prediccion
        assert "recomendaciones" in resultado_prediccion
        
        print("\nProcesamientos verificados correctamente.")
        print(f"Probabilidad: {resultado_prediccion['probabilidad']}")
        print(f"Nivel de riesgo: {resultado_prediccion['nivel_riesgo']}")
        print(f"Factores principales: {resultado_prediccion['factores_principales']}")
        
        # Verificar recomendaciones
        print("\nRecomendaciones:")
        for rec in resultado_prediccion['recomendaciones']:
            print(f"- {rec}")
        
        return True
    except Exception as e:
        print(f"Error en la prueba: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    resultado = probar_prediccion()
    print(f"\nPrueba {'exitosa' if resultado else 'fallida'}!")
