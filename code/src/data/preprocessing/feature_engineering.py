# Creación de características para modelos predictivos

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Union
from sklearn.base import BaseEstimator, TransformerMixin

class FeatureEngineer(BaseEstimator, TransformerMixin):
    def __init__(self, features_to_create: List[str] = None):
        self.features_to_create = features_to_create or []
    
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        X_df = X.copy() if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        return X_df

class CardiovascularFeatureEngineer(FeatureEngineer):
    def __init__(self, features_to_create: List[str] = None):
        super().__init__(features_to_create)
        self.reference_values = {
            'imc_normal': (18.5, 24.9),
            'presion_sistolica_normal': (90, 120),
            'presion_diastolica_normal': (60, 80)
        }
    
    def transform(self, X):
        X_df = super().transform(X)
        
        # Calcular IMC si no existe y tenemos peso y estatura
        if 'imc' not in X_df.columns and 'peso' in X_df.columns and 'estatura' in X_df.columns:
            # Asegurarse que la estatura esté en metros
            if X_df['estatura'].mean() > 3:  # Probablemente en cm
                X_df['estatura_m'] = X_df['estatura'] / 100
            else:
                X_df['estatura_m'] = X_df['estatura']
            
            X_df['imc'] = X_df['peso'] / (X_df['estatura_m'] ** 2)
        
        # Crear variables de rango de IMC
        if 'imc' in X_df.columns and 'imc_categoria' in self.features_to_create:
            X_df['imc_categoria'] = pd.cut(
                X_df['imc'], 
                bins=[0, 18.5, 25, 30, 35, 100], 
                labels=[0, 1, 2, 3, 4]  # Bajo peso, Normal, Sobrepeso, Obesidad I, Obesidad II+
            )
        
        # Crear variables de hipertensión
        if 'presion_sistolica' in X_df.columns and 'presion_diastolica' in X_df.columns:
            if 'hipertension' in self.features_to_create:
                X_df['hipertension'] = ((X_df['presion_sistolica'] >= 140) | 
                                        (X_df['presion_diastolica'] >= 90)).astype(int)
            
            if 'presion_media' in self.features_to_create:
                X_df['presion_media'] = ((2 * X_df['presion_diastolica']) + 
                                       X_df['presion_sistolica']) / 3
        
        # Crear variable de diferencial de presión
        if 'presion_sistolica' in X_df.columns and 'presion_diastolica' in X_df.columns and 'presion_diferencial' in self.features_to_create:
            X_df['presion_diferencial'] = X_df['presion_sistolica'] - X_df['presion_diastolica']
        
        # Crear variable de edad categorizada
        if 'edad' in X_df.columns and 'edad_categoria' in self.features_to_create:
            X_df['edad_categoria'] = pd.cut(
                X_df['edad'], 
                bins=[0, 30, 40, 50, 60, 70, 200], 
                labels=[0, 1, 2, 3, 4, 5]
            )
        
        # Crear interacciones relevantes
        if 'tabaco_edad' in self.features_to_create and 'edad' in X_df.columns and 'tabaco' in X_df.columns:
            X_df['tabaco_edad'] = X_df['tabaco'] * X_df['edad']
        
        if 'colesterol_edad' in self.features_to_create and 'edad' in X_df.columns and 'colesterol' in X_df.columns:
            X_df['colesterol_edad'] = X_df['colesterol'] * X_df['edad']
        
        return X_df