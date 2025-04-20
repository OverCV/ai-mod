# Extractores de datos para modelos predictivos

import pandas as pd
from pathlib import Path
from typing import Optional, Dict, Any, Union

class DataExtractor:
    """Clase base para la extracción de datos"""
    
    def extract(self) -> pd.DataFrame:
        """Método abstracto para extracción"""
        raise NotImplementedError("Implementar en subclases")

class CSVExtractor(DataExtractor):
    """Extractor para archivos CSV"""
    
    def __init__(self, file_path: Union[str, Path], **kwargs):
        self.file_path = Path(file_path)
        self.kwargs = kwargs
    
    def extract(self) -> pd.DataFrame:
        """Extraer datos desde un archivo CSV"""
        return pd.read_csv(self.file_path, **self.kwargs)

class DatabaseExtractor(DataExtractor):
    """Extractor para bases de datos"""
    
    def __init__(self, connection_string: str, query: str):
        self.connection_string = connection_string
        self.query = query
    
    def extract(self) -> pd.DataFrame:
        """Extraer datos desde una base de datos"""
        # Implementación básica usando pandas
        return pd.read_sql(self.query, self.connection_string)

class CardiovascularDataExtractor(CSVExtractor):
    """Extractor específico para datos cardiovasculares"""
    
    def __init__(self, file_path: Union[str, Path], **kwargs):
        super().__init__(file_path, **kwargs)
    
    def extract(self) -> pd.DataFrame:
        """Extraer datos cardiovasculares y realizar validaciones básicas"""
        df = super().extract()
        
        # Validaciones básicas
        required_columns = [
            'edad', 'genero', 'estatura', 'peso', 'presion_sistolica',
            'presion_diastolica', 'colesterol', 'enfermedad_cardiovascular'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Faltan columnas requeridas: {missing_columns}")
        
        # Eliminar columna 'Unnamed: 0' si existe
        if 'Unnamed: 0' in df.columns:
            df = df.drop('Unnamed: 0', axis=1)
        
        # Asegurar tipos de datos correctos
        numerical_cols = ['edad', 'estatura', 'peso', 'presion_sistolica', 'presion_diastolica', 'colesterol']
        for col in numerical_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Convertir variable objetivo a int
        if 'enfermedad_cardiovascular' in df.columns:
            df['enfermedad_cardiovascular'] = pd.to_numeric(df['enfermedad_cardiovascular'], errors='coerce').fillna(0).astype(int)
        
        return df