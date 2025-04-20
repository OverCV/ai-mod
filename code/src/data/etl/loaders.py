# Cargadores de datos procesados

import pandas as pd
import pickle
import json
from pathlib import Path
from typing import Dict, Any, Optional, Union

class DataLoader:
    """Clase base para carga de datos procesados"""
    
    def load(self, data, destination: Union[str, Path]) -> None:
        """Método abstracto para carga de datos"""
        raise NotImplementedError("Implementar en subclases")

class CSVLoader(DataLoader):
    """Cargador de datos a CSV"""
    
    def __init__(self, index: bool = False):
        self.index = index
    
    def load(self, data: pd.DataFrame, destination: Union[str, Path]) -> None:
        """Guarda datos en formato CSV"""
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        data.to_csv(destination, index=self.index)

class PickleLoader(DataLoader):
    """Cargador de datos a Pickle"""
    
    def load(self, data: Any, destination: Union[str, Path]) -> None:
        """Guarda datos en formato Pickle"""
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        with open(destination, 'wb') as f:
            pickle.dump(data, f)

class ModelLoader(DataLoader):
    """Cargador específico para modelos"""
    
    def __init__(self, save_metadata: bool = True):
        self.save_metadata = save_metadata
    
    def load(self, model: Any, destination: Union[str, Path], metadata: Optional[Dict[str, Any]] = None) -> None:
        """Guarda un modelo entrenado y opcionalmente sus metadatos"""
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        # Guardar el modelo
        with open(destination, 'wb') as f:
            pickle.dump(model, f)
        
        # Guardar metadatos si se proporcionan
        if metadata and self.save_metadata:
            metadata_path = destination.with_suffix('.json')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

class FeatureImportanceLoader(DataLoader):
    """Cargador específico para importancia de características"""
    
    def load(self, feature_importance: pd.DataFrame, destination: Union[str, Path]) -> None:
        """Guarda la importancia de características"""
        destination = Path(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        feature_importance.to_csv(destination, index=False)