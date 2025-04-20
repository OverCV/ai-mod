# Servicio de predicción de riesgo cardiovascular

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

class ServicioRiesgoCardiovascular:
    def __init__(self):
        self.model_path = Path(__file__).parent.parent.parent / "models" / "r_cardio"
        self.code_model_path = Path(__file__).parent.parent.parent.parent.parent / "models" / "r_cardio"
        self.modelo = None
        self.scaler = None
        self.feature_names = []
        self.cargar_modelo()
        
    def cargar_modelo(self):
        # Buscar archivos en orden de prioridad
        archivos_modelo = [
            ("mejor_modelo.pkl", "scaler.pkl", "features.txt"),
            ("rf_cardio_model.pkl", "rf_cardio_scaler.pkl", "rf_cardio_features.txt"),
            ("cardio_model.pkl", "cardio_scaler.pkl", "cardio_features.txt")
        ]
        
        # Intentar cargar desde api/models primero
        for modelo_name, scaler_name, features_name in archivos_modelo:
            modelo_file = self.model_path / modelo_name
            scaler_file = self.model_path / scaler_name
            features_file = self.model_path / features_name
            
            if modelo_file.exists() and scaler_file.exists():
                break
                
        # Si no se encontraron en api/models, buscar en code/models
        if not modelo_file.exists() or not scaler_file.exists():
            for modelo_name, scaler_name, features_name in archivos_modelo:
                modelo_file = self.code_model_path / modelo_name
                scaler_file = self.code_model_path / scaler_name
                features_file = self.code_model_path / features_name
                
                if modelo_file.exists() and scaler_file.exists():
                    # Copiar a api/models para futuras ejecuciones
                    import shutil
                    self.model_path.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(modelo_file, self.model_path / modelo_name)
                    shutil.copy2(scaler_file, self.model_path / scaler_name)
                    if features_file.exists():
                        shutil.copy2(features_file, self.model_path / features_name)
                    
                    # Actualizar rutas
                    modelo_file = self.model_path / modelo_name
                    scaler_file = self.model_path / scaler_name
                    features_file = self.model_path / features_name
                    break
        
        if not modelo_file.exists() or not scaler_file.exists():
            raise FileNotFoundError(f"No se encontraron los modelos en {self.model_path} ni en {self.code_model_path}")
        
        try:
            self.modelo = joblib.load(modelo_file)
            self.scaler = joblib.load(scaler_file)
            print(f"Modelo cargado: {modelo_file}")
            print(f"Scaler cargado: {scaler_file}")
        except Exception as e:
            import traceback
            error_str = traceback.format_exc()
            raise ValueError(f"Error al cargar modelo ({modelo_file}): {str(e)}\n{error_str}")
        
        # Cargar lista de características
        if features_file.exists():
            with open(features_file, "r") as f:
                self.feature_names = [line.strip() for line in f]
    
    def procesar_datos(self, datos: Dict) -> pd.DataFrame:
        df = pd.DataFrame([datos])
        
        # Calcular IMC si no está presente
        if 'imc' not in df.columns and 'peso' in df.columns and 'estatura' in df.columns:
            # Convertir estatura de cm a m
            estatura_m = df['estatura'] / 100
            df['imc'] = df['peso'] / (estatura_m ** 2)
        
        # Calcular presión media si se requiere
        if 'presion_media' not in df.columns and 'presion_sistolica' in df.columns and 'presion_diastolica' in df.columns:
            df['presion_media'] = ((2 * df['presion_diastolica']) + df['presion_sistolica']) / 3
        
        # Calcular presión diferencial si se requiere
        if 'presion_diferencial' not in df.columns and 'presion_sistolica' in df.columns and 'presion_diastolica' in df.columns:
            df['presion_diferencial'] = df['presion_sistolica'] - df['presion_diastolica']
        
        # Calcular hipertensión si se requiere
        if 'hipertension' not in df.columns and 'presion_sistolica' in df.columns and 'presion_diastolica' in df.columns:
            df['hipertension'] = ((df['presion_sistolica'] >= 140) | (df['presion_diastolica'] >= 90)).astype(int)
        
        # Asegurar que tenemos todas las columnas necesarias para el modelo
        missing_cols = [col for col in self.feature_names if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Faltan columnas requeridas: {missing_cols}")
        
        # Reordenar columnas según el modelo
        df = df[self.feature_names]
        
        return df
    
    def predecir(self, datos: Dict, paciente_id: Optional[int] = None, guardar_db: bool = False, db = None) -> Dict:
        try:
            # Preprocesar datos
            df = self.procesar_datos(datos)
            
            # Escalar datos
            df_scaled = self.scaler.transform(df)
            
            # Realizar predicción
            probabilidad = self.modelo.predict_proba(df_scaled)[0, 1]
            prediccion = int(probabilidad >= 0.5)
            
            # Determinar nivel de riesgo
            if probabilidad < 0.3:
                nivel_riesgo = "Bajo"
            elif probabilidad < 0.7:
                nivel_riesgo = "Moderado"
            else:
                nivel_riesgo = "Alto"
            
            # Obtener factores principales si el modelo lo permite
            factores_principales = []
            if hasattr(self.modelo, 'feature_importances_'):
                importancias = self.modelo.feature_importances_
                indices_ordenados = np.argsort(importancias)[::-1]
                
                for i in range(min(3, len(self.feature_names))):
                    idx = indices_ordenados[i]
                    factores_principales.append({self.feature_names[idx]: float(importancias[idx])})            
            
            # Generar recomendaciones basadas en factores de riesgo
            recomendaciones = self.generar_recomendaciones(datos, probabilidad, factores_principales)
            
            resultado = {
                "probabilidad": float(probabilidad),
                "riesgo": bool(prediccion),
                "nivel_riesgo": nivel_riesgo,
                "factores_principales": factores_principales,
                "recomendaciones": recomendaciones
            }
            
            # Guardar predicción en base de datos si se solicita
            if guardar_db and paciente_id and db:
                from datetime import datetime
                from api.core.repository.predicciones import RepositorioPredicciones
                
                datos_db = {
                    "paciente_id": paciente_id,
                    "campana_id": None,  # Se puede asignar si se proporciona
                    "tipo": "RIESGO_CV",
                    "valor_prediccion": float(probabilidad * 100),  # Convertir a porcentaje 0-100
                    "confianza": 85.0,  # Valor estático por ahora, se podría calcular
                    "factores_influyentes": {f[k]: v for f in factores_principales for k, v in f.items()},
                    "fecha_prediccion": datetime.now().date(),
                    "modelo_version": self.__class__.__name__ + "-" + type(self.modelo).__name__
                }
                
                repo = RepositorioPredicciones(db)
                prediccion_db = repo.crear_prediccion(datos_db)
                resultado["id_prediccion"] = prediccion_db.id
            
            return resultado
            
        except Exception as e:
            raise Exception(f"Error al realizar predicción: {str(e)}")
    
    def generar_recomendaciones(self, datos: Dict, probabilidad: float, factores: List[Dict]) -> List[str]:
        recomendaciones = []
        
        # Recomendación base según nivel de riesgo
        if probabilidad >= 0.7:
            recomendaciones.append("Consulte a un médico lo antes posible para una evaluación cardiovascular completa.")
        elif probabilidad >= 0.3:
            recomendaciones.append("Se recomienda una evaluación médica para evaluar su riesgo cardiovascular.")
        
        # Recomendaciones basadas en factores específicos
        if datos.get('presion_sistolica', 0) >= 140 or datos.get('presion_diastolica', 0) >= 90:
            recomendaciones.append("Considere monitorear su presión arterial regularmente y reducir el consumo de sal.")
        
        if datos.get('colesterol', 0) >= 2:
            recomendaciones.append("Se recomienda una dieta baja en grasas saturadas y control del colesterol.")
        
        if datos.get('tabaco', 0) == 1:
            recomendaciones.append("Dejar de fumar puede reducir significativamente su riesgo cardiovascular.")
        
        if datos.get('peso', 0) > 0 and datos.get('estatura', 0) > 0:
            imc = datos['peso'] / ((datos['estatura']/100) ** 2)
            if imc >= 25:
                recomendaciones.append("Alcanzar un peso saludable mediante dieta equilibrada y ejercicio.")
        
        if datos.get('act_fisica', 0) == 0:
            recomendaciones.append("Se recomienda realizar al menos 150 minutos de actividad física moderada semanalmente.")
            
        if len(recomendaciones) == 0:
            recomendaciones.append("Mantenga un estilo de vida saludable con dieta equilibrada y ejercicio regular.")
        
        return recomendaciones