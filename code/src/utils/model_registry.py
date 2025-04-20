# Registro y gestión de modelos

import json
import shutil
import pickle
from typing import Dict, List, Optional, Union, Any
from pathlib import Path
from datetime import datetime
import pandas as pd

class ModelRegistry:
    def __init__(self, base_dir: Union[str, Path]):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.base_dir / 'registry.json'
        self.registry = self._load_registry()
    
    def _load_registry(self) -> Dict:
        if self.registry_file.exists():
            with open(self.registry_file, 'r') as f:
                return json.load(f)
        return {'models': {}}
    
    def _save_registry(self) -> None:
        with open(self.registry_file, 'w') as f:
            json.dump(self.registry, f, indent=2)
    
    def register_model(self, model_type: str, model_name: str, model_version: str, 
                     model_path: Union[str, Path], metadata: Optional[Dict] = None) -> None:
        model_path = Path(model_path)
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        if model_type not in self.registry['models']:
            self.registry['models'][model_type] = {}
        
        # Crear directorio para el modelo si no existe
        model_dir = self.base_dir / model_type / model_name / model_version
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Copiar modelo al registro
        dest_path = model_dir / model_path.name
        shutil.copy2(model_path, dest_path)
        
        # Registrar metadata
        model_info = {
            'path': str(dest_path.relative_to(self.base_dir)),
            'registered_at': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        if model_name not in self.registry['models'][model_type]:
            self.registry['models'][model_type][model_name] = {}
        
        self.registry['models'][model_type][model_name][model_version] = model_info
        self._save_registry()
    
    def get_model(self, model_type: str, model_name: str, model_version: Optional[str] = None) -> Dict:
        if model_type not in self.registry['models']:
            raise ValueError(f"Model type not found: {model_type}")
        
        if model_name not in self.registry['models'][model_type]:
            raise ValueError(f"Model name not found: {model_name}")
        
        if model_version is None:
            # Obtener la última versión
            versions = sorted(self.registry['models'][model_type][model_name].keys())
            if not versions:
                raise ValueError(f"No versions found for model: {model_name}")
            model_version = versions[-1]
        
        if model_version not in self.registry['models'][model_type][model_name]:
            raise ValueError(f"Model version not found: {model_version}")
        
        return self.registry['models'][model_type][model_name][model_version]
    
    def load_model(self, model_type: str, model_name: str, model_version: Optional[str] = None) -> Any:
        model_info = self.get_model(model_type, model_name, model_version)
        model_path = self.base_dir / model_info['path']
        
        with open(model_path, 'rb') as f:
            return pickle.load(f)
    
    def get_model_versions(self, model_type: str, model_name: str) -> List[str]:
        if model_type not in self.registry['models']:
            raise ValueError(f"Model type not found: {model_type}")
        
        if model_name not in self.registry['models'][model_type]:
            raise ValueError(f"Model name not found: {model_name}")
        
        return sorted(self.registry['models'][model_type][model_name].keys())
    
    def get_model_types(self) -> List[str]:
        return list(self.registry['models'].keys())
    
    def get_models_by_type(self, model_type: str) -> List[str]:
        if model_type not in self.registry['models']:
            raise ValueError(f"Model type not found: {model_type}")
        
        return list(self.registry['models'][model_type].keys())
    
    def delete_model(self, model_type: str, model_name: str, model_version: Optional[str] = None) -> None:
        if model_type not in self.registry['models']:
            raise ValueError(f"Model type not found: {model_type}")
        
        if model_name not in self.registry['models'][model_type]:
            raise ValueError(f"Model name not found: {model_name}")
        
        if model_version is None:
            # Eliminar todas las versiones
            for version in list(self.registry['models'][model_type][model_name].keys()):
                model_info = self.registry['models'][model_type][model_name][version]
                model_path = self.base_dir / model_info['path']
                if model_path.exists():
                    model_path.unlink()
            
            del self.registry['models'][model_type][model_name]
        else:
            if model_version not in self.registry['models'][model_type][model_name]:
                raise ValueError(f"Model version not found: {model_version}")
            
            model_info = self.registry['models'][model_type][model_name][model_version]
            model_path = self.base_dir / model_info['path']
            if model_path.exists():
                model_path.unlink()
            
            del self.registry['models'][model_type][model_name][model_version]
        
        self._save_registry()