from pathlib import Path
import sys
import json
import pandas as pd
from datetime import datetime

current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from api.core.data.db_connector import get_db
from api.core.services.riesgo_cv import ServicioRiesgoCardiovascular
from api.core.repository.predicciones import RepositorioPredicciones
from sqlalchemy import text

def obtener_o_crear_paciente_prueba(db):
    """Obtiene o crea un paciente de prueba en la base de datos"""
    # Intentar obtener un paciente existente primero
    try:
        # Intentar obtener paciente de usuario con rol paciente
        resultado = db.execute(text("""
            SELECT p.id FROM pacientes p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN roles r ON u.rol_id = r.id
            WHERE r.nombre = 'paciente'
            LIMIT 1
        """)).fetchone()
        
        if resultado:
            print(f"Usando paciente existente con ID: {resultado[0]}")
            return resultado[0]
    except Exception as e:
        print(f"Error al buscar paciente: {str(e)}")
        # Continuamos con la creación
    
    # Si no hay pacientes, creamos uno
    try:
        # Crear localización
        localizacion_id = db.execute(text(
            """INSERT INTO localizacion (departamento, municipio, vereda) 
               VALUES ('Antioquia', 'Medellín', 'Centro') RETURNING id"""
        )).fetchone()[0]
        
        # Verificar si existe un usuario para pruebas
        usuario_id = db.execute(text(
            """SELECT id FROM usuarios WHERE correo = 'paciente.prueba@example.com' LIMIT 1"""
        )).fetchone()
        
        if not usuario_id:
            # Crear usuario
            usuario_id = db.execute(text(
                """INSERT INTO usuarios (tipo_identificacion, identificacion, 
                                      nombres, apellidos, correo, clave, 
                                      celular, rol_id, esta_activo) 
                  VALUES ('cc', '1234567890', 'Paciente', 'Prueba', 
                          'paciente.prueba@example.com', 'clave123', 
                          '3004567890', (SELECT id FROM roles WHERE nombre = 'paciente' LIMIT 1), TRUE) 
                  RETURNING id"""
            )).fetchone()[0]
        else:
            usuario_id = usuario_id[0]
        
        # Verificar si ya existe un paciente para este usuario
        paciente_existente = db.execute(text(
            """SELECT id FROM pacientes WHERE usuario_id = :usuario_id LIMIT 1""").bindparams(usuario_id=usuario_id)
        ).fetchone()
        
        if not paciente_existente:
            # Crear paciente
            paciente_id = db.execute(text(
                """INSERT INTO pacientes (fecha_nacimiento, genero, direccion, 
                                       localizacion_id, usuario_id, fecha_registro) 
                   VALUES (current_date - interval '50 years', 'MASCULINO', 
                           'Calle Principal 123', :localizacion_id, :usuario_id, current_date) 
                   RETURNING id""").bindparams(localizacion_id=localizacion_id, usuario_id=usuario_id)
            ).fetchone()[0]
        else:
            paciente_id = paciente_existente[0]
        
        db.commit()
        print(f"Paciente de prueba creado con ID: {paciente_id}")
        return paciente_id
    except Exception as e:
        db.rollback()
        print(f"Error al crear paciente de prueba: {str(e)}")
        raise

def crear_datos_clinicos_paciente(db, paciente_id):
    """Crea datos clínicos para un paciente"""
    try:
        # Registrar datos clínicos
        datos_id = db.execute(text(
            """INSERT INTO datos_clinicos (paciente_id, fecha_registro, 
                                      presion_sistolica, presion_diastolica,
                                      frecuencia_cardiaca_min, frecuencia_cardiaca_max,
                                      saturacion_oxigeno, temperatura, peso, talla, imc)
               VALUES (:paciente_id, current_date, 140, 90, 60, 120, 98, 36.5, 80, 170, 27.68)
               RETURNING id""").bindparams(paciente_id=paciente_id)
        ).fetchone()[0]
        
        # Registrar triaje
        triaje_id = db.execute(text(
            """INSERT INTO triajes (paciente_id, fecha_triaje, edad, 
                               presion_sistolica, presion_diastolica,
                               colesterol_total, hdl, tabaquismo, 
                               alcoholismo, diabetes, peso, talla, imc)
               VALUES (:paciente_id, current_date, 50, 140, 90, 220, 45, TRUE, 
                       FALSE, FALSE, 80, 170, 27.68)
               RETURNING id""").bindparams(paciente_id=paciente_id)
        ).fetchone()[0]
        
        db.commit()
        
        # Retornar datos para predicción
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
        
        return datos_paciente, datos_id, triaje_id
    except Exception as e:
        db.rollback()
        print(f"Error al crear datos clínicos: {str(e)}")
        raise

def probar_prediccion_bd():
    """Prueba la predicción de riesgo cardiovascular con datos de la BD"""
    print("Iniciando prueba de predicción con base de datos...")
    
    # Obtener conexión a la base de datos
    db = next(get_db())
    
    try:
        # Obtener o crear paciente de prueba
        paciente_id = obtener_o_crear_paciente_prueba(db)
        
        # Crear datos clínicos para el paciente
        datos_paciente, datos_id, triaje_id = crear_datos_clinicos_paciente(db, paciente_id)
        
        # Realizar predicción
        servicio = ServicioRiesgoCardiovascular()
        resultado_prediccion = servicio.predecir(
            datos=datos_paciente, 
            paciente_id=paciente_id, 
            guardar_db=True, 
            db=db
        )
        
        print("\nResultado de predicción:")
        print(json.dumps(resultado_prediccion, indent=2, ensure_ascii=False))
        
        # Verificar que se guardó en la base de datos
        if "id_prediccion" in resultado_prediccion:
            repo = RepositorioPredicciones(db)
            prediccion_guardada = repo.obtener_prediccion(resultado_prediccion["id_prediccion"])
            print("\nPredicción guardada en la base de datos:")
            print(json.dumps(prediccion_guardada.to_dict(), indent=2, ensure_ascii=False))
        
        # Verificar el estado de salud del paciente
        print("\nVerificando endpoint de estado de salud del paciente:")
        from fastapi.testclient import TestClient
        from api.main import app
        
        client = TestClient(app)
        response = client.get(f"/riesgo-cardiovascular/estado-salud/{paciente_id}")
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
        # Registrar histórico de predicciones
        predicciones = repo.obtener_predicciones_paciente(paciente_id, "RIESGO_CV")
        print(f"\nHistorial de predicciones para el paciente {paciente_id}:")
        for pred in predicciones:
            print(f"Fecha: {pred.fecha_prediccion}, Valor: {pred.valor_prediccion}%, Modelo: {pred.modelo_version}")
        
        return True
    except Exception as e:
        print(f"Error en la prueba: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    resultado = probar_prediccion_bd()
    print(f"\nPrueba {'exitosa' if resultado else 'fallida'}!")
