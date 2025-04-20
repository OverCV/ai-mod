# Clase base para todos los modelos

import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
from typing import Dict, List, Optional, Union, Any, Tuple
from datetime import datetime
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.base import BaseEstimator

class ModelBase:
    def __init__(self, model_config: Any):
        self.model_config = model_config
        self.models = {}
        self.preprocessors = {}
        self.metrics = {}
        self.feature_importances = {}
    
    def prepare_data(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
        return X, y
    
    def train(self, X: pd.DataFrame, y: pd.Series) -> None:
        raise NotImplementedError("Método debe ser implementado por subclases")
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError("Método debe ser implementado por subclases")
    
    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, float]:
        raise NotImplementedError("Método debe ser implementado por subclases")
    
    def save_model(self, model_name: str, file_path: Union[str, Path]) -> None:
        file_path = Path(file_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        model_data = {
            'model': self.models.get(model_name),
            'preprocessor': self.preprocessors.get(model_name),
            'metrics': self.metrics.get(model_name),
            'feature_importance': self.feature_importances.get(model_name),
            'config': self.model_config,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(file_path, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, file_path: Union[str, Path], model_name: str) -> None:
        file_path = Path(file_path)
        
        with open(file_path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.models[model_name] = model_data.get('model')
        self.preprocessors[model_name] = model_data.get('preprocessor')
        self.metrics[model_name] = model_data.get('metrics')
        self.feature_importances[model_name] = model_data.get('feature_importance')
    
    def save_features(self, model_name: str, file_path: Union[str, Path]) -> None:
        file_path = Path(file_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        feature_importance = self.feature_importances.get(model_name)
        if feature_importance is not None:
            if isinstance(feature_importance, pd.DataFrame):
                feature_importance.to_csv(file_path, index=False)
            else:
                pd.DataFrame(feature_importance).to_csv(file_path, index=False)

class ClassificationModelBase(ModelBase):
    def evaluate(self, X: pd.DataFrame, y: pd.Series, model_name: str = 'default') -> Dict[str, float]:
        if model_name not in self.models:
            raise ValueError(f"Modelo no encontrado: {model_name}")
        
        model = self.models[model_name]
        preprocessor = self.preprocessors.get(model_name)
        
        if preprocessor is not None:
            X_processed = preprocessor.transform(X)
        else:
            X_processed = X
        
        y_pred = model.predict(X_processed)
        
        try:
            y_pred_proba = model.predict_proba(X_processed)[:, 1]
            has_proba = True
        except (AttributeError, IndexError):
            has_proba = False
        
        metrics = {
            'accuracy': accuracy_score(y, y_pred),
            'precision': precision_score(y, y_pred, zero_division=0),
            'recall': recall_score(y, y_pred, zero_division=0),
            'f1': f1_score(y, y_pred, zero_division=0),
        }
        
        if has_proba:
            metrics['roc_auc'] = roc_auc_score(y, y_pred_proba)
        
        self.metrics[model_name] = metrics
        return metrics

class RegressionModelBase(ModelBase):
    def evaluate(self, X: pd.DataFrame, y: pd.Series, model_name: str = 'default') -> Dict[str, float]:
        if model_name not in self.models:
            raise ValueError(f"Modelo no encontrado: {model_name}")
        
        model = self.models[model_name]
        preprocessor = self.preprocessors.get(model_name)
        
        if preprocessor is not None:
            X_processed = preprocessor.transform(X)
        else:
            X_processed = X
        
        y_pred = model.predict(X_processed)
        
        metrics = {
            'rmse': np.sqrt(mean_squared_error(y, y_pred)),
            'mae': mean_absolute_error(y, y_pred),
            'r2': r2_score(y, y_pred)
        }
        
        self.metrics[model_name] = metrics
        return metrics