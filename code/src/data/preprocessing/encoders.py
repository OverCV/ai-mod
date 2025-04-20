# Encoders para variables categóricas

import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from sklearn.base import BaseEstimator, TransformerMixin

class CategoricalEncoder(BaseEstimator, TransformerMixin):
    """Codificador base para variables categóricas"""
    
    def __init__(self, columns: Optional[List[str]] = None):
        self.columns = columns
    
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        return X

class BinaryEncoder(CategoricalEncoder):
    """Codificador para variables binarias"""
    
    def __init__(self, columns: Optional[List[str]] = None, mapping: Optional[Dict[str, Dict[str, int]]] = None):
        super().__init__(columns)
        self.mapping = mapping or {}
        self.fitted_mappings_ = {}
    
    def fit(self, X, y=None):
        """Ajusta el codificador a los datos"""
        X_df = X.copy() if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        
        # Determinar columnas si no se especificaron
        if self.columns is None:
            self.columns = X_df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Crear mapeos para cada columna
        for column in self.columns:
            if column in self.mapping:
                self.fitted_mappings_[column] = self.mapping[column]
            else:
                unique_values = X_df[column].unique()
                if len(unique_values) <= 2:
                    # Mapeo automático para columnas binarias
                    self.fitted_mappings_[column] = {v: i for i, v in enumerate(unique_values)}
        
        return self
    
    def transform(self, X):
        """Transforma los datos usando los mapeos"""
        X_df = X.copy() if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        
        for column, mapping in self.fitted_mappings_.items():
            if column in X_df.columns:
                X_df[column] = X_df[column].map(mapping)
                # Valores no vistos durante el entrenamiento se convierten a -1
                X_df[column] = X_df[column].fillna(-1).astype(int)
        
        return X_df

class MultiCategoryEncoder(CategoricalEncoder):
    """Codificador para variables categóricas con múltiples valores"""
    
    def __init__(self, columns: Optional[List[str]] = None, max_categories: int = 10):
        super().__init__(columns)
        self.max_categories = max_categories
        self.encoders_ = {}
        self.categories_ = {}
    
    def fit(self, X, y=None):
        """Ajusta el codificador a los datos"""
        X_df = X.copy() if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        
        # Determinar columnas si no se especificaron
        if self.columns is None:
            self.columns = X_df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        for column in self.columns:
            # Obtener las categorías más frecuentes
            value_counts = X_df[column].value_counts()
            if len(value_counts) > self.max_categories:
                top_categories = value_counts.nlargest(self.max_categories).index.tolist()
                self.categories_[column] = top_categories + ['other']
            else:
                self.categories_[column] = value_counts.index.tolist()
            
            # Crear encoder
            encoder = OneHotEncoder(sparse=False, categories=[self.categories_[column]])
            encoder.fit(X_df[[column]])
            self.encoders_[column] = encoder
        
        return self
    
    def transform(self, X):
        """Transforma los datos usando one-hot encoding"""
        X_df = X.copy() if isinstance(X, pd.DataFrame) else pd.DataFrame(X)
        result_df = X_df.copy()
        
        for column, encoder in self.encoders_.items():
            if column in X_df.columns:
                # Remplazar categorías no vistas con 'other'
                mask = ~X_df[column].isin(self.categories_[column][:-1])  # Excluir 'other'
                if mask.any():
                    X_df.loc[mask, column] = 'other'
                
                # Aplicar one-hot encoding
                encoded = encoder.transform(X_df[[column]])
                encoded_df = pd.DataFrame(
                    encoded, 
                    columns=[f"{column}_{cat}" for cat in self.categories_[column]],
                    index=X_df.index
                )
                
                # Reemplazar la columna original con las columnas codificadas
                result_df = result_df.drop(column, axis=1)
                result_df = pd.concat([result_df, encoded_df], axis=1)
        
        return result_df