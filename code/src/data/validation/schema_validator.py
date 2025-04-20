# Validadores de esquemas para conjuntos de datos

import pandas as pd
from typing import List, Dict, Optional, Union, Set

class SchemaValidator:
    def __init__(self, required_columns: List[str] = None, 
                 column_types: Dict[str, type] = None,
                 value_ranges: Dict[str, tuple] = None):
        self.required_columns = required_columns or []
        self.column_types = column_types or {}
        self.value_ranges = value_ranges or {}
    
    def validate(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        errors = {}
        
        # Verificar columnas requeridas
        if self.required_columns:
            missing_columns = [col for col in self.required_columns if col not in df.columns]
            if missing_columns:
                errors['missing_columns'] = missing_columns
        
        # Verificar tipos de columnas
        if self.column_types:
            type_errors = []
            for col, expected_type in self.column_types.items():
                if col in df.columns:
                    if expected_type == int:
                        if not pd.api.types.is_integer_dtype(df[col]):
                            type_errors.append(f"{col}: esperado {expected_type.__name__}, encontrado {df[col].dtype}")
                    elif expected_type == float:
                        if not pd.api.types.is_float_dtype(df[col]):
                            type_errors.append(f"{col}: esperado {expected_type.__name__}, encontrado {df[col].dtype}")
                    elif expected_type == str:
                        if not pd.api.types.is_string_dtype(df[col]):
                            type_errors.append(f"{col}: esperado {expected_type.__name__}, encontrado {df[col].dtype}")
                    elif expected_type == bool:
                        if not pd.api.types.is_bool_dtype(df[col]):
                            type_errors.append(f"{col}: esperado {expected_type.__name__}, encontrado {df[col].dtype}")
            if type_errors:
                errors['type_errors'] = type_errors
        
        # Verificar rangos de valores
        if self.value_ranges:
            range_errors = []
            for col, (min_val, max_val) in self.value_ranges.items():
                if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                    if df[col].min() < min_val or df[col].max() > max_val:
                        range_errors.append(f"{col}: valores fuera del rango [{min_val}, {max_val}]")
            if range_errors:
                errors['range_errors'] = range_errors
        
        return errors

class CardiovascularDataValidator(SchemaValidator):
    def __init__(self):
        super().__init__(
            required_columns=[
                'edad', 'genero', 'presion_sistolica', 'presion_diastolica', 
                'enfermedad_cardiovascular'
            ],
            column_types={
                'edad': int,
                'genero': int,  # 0: Femenino, 1: Masculino
                'estatura': float,
                'peso': float,
                'presion_sistolica': float,
                'presion_diastolica': float,
                'colesterol': int,  # Puede ser categorizado como 1, 2, 3
                'glucosa': int,  # Puede ser categorizado como 1, 2, 3
                'tabaco': int,  # 0: No, 1: Sí
                'alcohol': int,  # 0: No, 1: Sí
                'act_fisica': int,  # 0: No, 1: Sí
                'enfermedad_cardiovascular': int  # 0: No, 1: Sí
            },
            value_ranges={
                'edad': (0, 150),
                'genero': (0, 1),
                'estatura': (0, 250),  # cm
                'peso': (0, 300),  # kg
                'presion_sistolica': (50, 250),
                'presion_diastolica': (30, 150),
                'colesterol': (1, 3),  # 1: Normal, 2: Por encima de lo normal, 3: Muy por encima
                'glucosa': (1, 3),  # 1: Normal, 2: Por encima de lo normal, 3: Muy por encima
                'tabaco': (0, 1),
                'alcohol': (0, 1),
                'act_fisica': (0, 1),
                'enfermedad_cardiovascular': (0, 1)
            }
        )
    
    def validate(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        errors = super().validate(df)
        
        # Verificaciones específicas para datos cardiovasculares
        medical_errors = []
        
        # Verificar relación entre presión sistólica y diastólica
        if ('presion_sistolica' in df.columns and 'presion_diastolica' in df.columns and 
            pd.api.types.is_numeric_dtype(df['presion_sistolica']) and 
            pd.api.types.is_numeric_dtype(df['presion_diastolica'])):
            if (df['presion_sistolica'] < df['presion_diastolica']).any():
                medical_errors.append("Valores de presión arterial incorrectos: sistólica < diastólica")
        
        # Verificar IMC si existe
        if 'imc' in df.columns and pd.api.types.is_numeric_dtype(df['imc']):
            if (df['imc'] < 10).any() or (df['imc'] > 60).any():
                medical_errors.append("Valores de IMC fuera de rangos clínicamente posibles")
        
        if medical_errors:
            errors['medical_errors'] = medical_errors
        
        return errors