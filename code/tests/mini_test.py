# Test simplificado para diagnóstico

import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data.etl.extractors import CardiovascularDataExtractor
from src.data.etl.transformers import CardiovascularTransformer

def run_simple_test():
    # Obtener ruta al dataset
    base_path = Path(__file__).parent.parent
    data_path = base_path / "src" / "data" / "datasets" / "riesgo_cardiovascular" / "enfermedades_cardiovasculares.csv"
    
    print(f"Verificando dataset en: {data_path}")
    print(f"Existe archivo: {data_path.exists()}")
    
    # Cargar datos directamente
    try:
        df = pd.read_csv(data_path)
        print(f"\nDataset cargado exitosamente.")
        print(f"Dimensiones: {df.shape}")
        print(f"Columnas: {df.columns.tolist()}")
        print(f"Primeras 3 filas:\n{df.head(3)}")
        
        # Aplicar transformaciones
        transformer = CardiovascularTransformer()
        df_transformed = transformer.transform(df)
        
        print(f"\nDatos transformados:")
        print(f"Tipos de datos:\n{df_transformed.dtypes}")
        
        # Variable objetivo
        if 'enfermedad_cardiovascular' in df_transformed.columns:
            y = df_transformed['enfermedad_cardiovascular']
            print(f"\nValores únicos en variable objetivo: {y.unique()}")
            print(f"Tipo de variable objetivo: {y.dtype}")
        
    except Exception as e:
        print(f"Error al cargar o procesar datos: {e}")

if __name__ == "__main__":
    run_simple_test()