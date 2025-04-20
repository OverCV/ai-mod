# Transformadores de datos para modelos predictivos

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

class DataTransformer:
    """Clase base para transformación de datos"""
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Método abstracto para transformación"""
        raise NotImplementedError("Implementar en subclases")

class CardiovascularTransformer(DataTransformer):
    """Transformador específico para datos cardiovasculares"""
    
    def __init__(self, impute_missing: bool = True, compute_bmi: bool = True):
        self.impute_missing = impute_missing
        self.compute_bmi = compute_bmi
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transforma datos cardiovasculares"""
        # Copia para no modificar el original
        df_transformed = df.copy()
        
        # Manejo de valores nulos
        if self.impute_missing:
            # Imputa valores numéricos con la mediana
            numeric_cols = df_transformed.select_dtypes(include=['number']).columns
            for col in numeric_cols:
                df_transformed[col] = df_transformed[col].fillna(df_transformed[col].median())
        
        # Calcular IMC si no existe
        if self.compute_bmi and 'imc' not in df_transformed.columns and 'peso' in df_transformed.columns and 'estatura' in df_transformed.columns:
            # Asegurarse que la estatura esté en metros
            if df_transformed['estatura'].mean() > 3:  # Probablemente en cm
                df_transformed['estatura'] = df_transformed['estatura'] / 100
            
            df_transformed['imc'] = df_transformed['peso'] / (df_transformed['estatura'] ** 2)
        
        # Codificar variables categóricas
        if 'genero' in df_transformed.columns:
            # Convertir a 0 y 1 (0: Femenino, 1: Masculino)
            if df_transformed['genero'].dtype == 'object':
                df_transformed['genero'] = df_transformed['genero'].map({'FEMENINO': 0, 'MASCULINO': 1})
            elif df_transformed['genero'].max() > 1:  # Si usa 1 y 2 en lugar de 0 y 1
                df_transformed['genero'] = df_transformed['genero'] - 1
        
        # Asegurar que la variable objetivo sea numérica
        if 'enfermedad_cardiovascular' in df_transformed.columns:
            df_transformed['enfermedad_cardiovascular'] = pd.to_numeric(df_transformed['enfermedad_cardiovascular'], errors='coerce').fillna(0).astype(int)
        
        # Derivar nuevas variables
        if 'presion_sistolica' in df_transformed.columns and 'presion_diastolica' in df_transformed.columns:
            # Presión arterial media
            df_transformed['presion_media'] = ((2 * df_transformed['presion_diastolica']) + 
                                       df_transformed['presion_sistolica']) / 3
        
        # Discretizar variables continuas si es necesario
        if 'colesterol' in df_transformed.columns and df_transformed['colesterol'].nunique() > 10:
            # Discretizar en rangos clínicamente relevantes
            bins = [0, 200, 240, np.inf]
            labels = [0, 1, 2]  # Normal, Elevado, Alto
            df_transformed['colesterol_cat'] = pd.cut(df_transformed['colesterol'], bins=bins, labels=labels)
            
        return df_transformed