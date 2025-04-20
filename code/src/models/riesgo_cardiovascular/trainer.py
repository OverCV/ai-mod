# Entrenamiento de modelos de riesgo cardiovascular

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import time

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import xgboost as xgb
from lightgbm import LGBMClassifier

from src.config.settings import RiesgoCardiovascularConfig
from src.config.logging_config import get_model_logger

class CardiovascularModelTrainer:
    def __init__(self, config=None):
        self.config = config or RiesgoCardiovascularConfig()
        self.logger = get_model_logger("riesgo_cardiovascular")
        self.model_results = {}
        self.best_model = None
        self.best_model_name = None
        self.best_score = 0.0
    
    def train_models(self, X_train: pd.DataFrame, y_train: pd.Series, preprocessor=None) -> Dict[str, Dict]:
        models = {
            "logistic_regression": LogisticRegression(max_iter=1000, random_state=self.config.random_state),
            "random_forest": RandomForestClassifier(random_state=self.config.random_state),
            "gradient_boosting": GradientBoostingClassifier(random_state=self.config.random_state),
            "xgboost": xgb.XGBClassifier(random_state=self.config.random_state),
            "lightgbm": LGBMClassifier(random_state=self.config.random_state),
            "svm": SVC(probability=True, random_state=self.config.random_state)
        }
        
        if preprocessor is not None:
            X_train_processed = preprocessor.transform(X_train)
        else:
            X_train_processed = X_train
        
        results = {}
        for name, model in models.items():
            self.logger.info(f"Training {name} model...")
            start_time = time.time()
            model.fit(X_train_processed, y_train)
            train_time = time.time() - start_time
            
            results[name] = {
                "model": model,
                "train_time": train_time
            }
            
            if hasattr(model, "feature_importances_"):
                feature_names = X_train.columns
                importance = model.feature_importances_
                feature_importance = pd.DataFrame({
                    "feature": feature_names,
                    "importance": importance
                }).sort_values("importance", ascending=False)
                results[name]["feature_importance"] = feature_importance
        
        return results
    
    def evaluate_models(self, trained_models: Dict[str, Dict], X_test: pd.DataFrame, y_test: pd.Series, 
                       preprocessor=None, threshold=0.5) -> Dict[str, Dict]:
        evaluation_results = {}
        
        if preprocessor is not None:
            X_test_processed = preprocessor.transform(X_test)
        else:
            X_test_processed = X_test
        
        for name, model_dict in trained_models.items():
            model = model_dict["model"]
            
            start_time = time.time()
            y_pred = model.predict(X_test_processed)
            inference_time = time.time() - start_time
            
            try:
                y_prob = model.predict_proba(X_test_processed)[:, 1]
                auc_score = roc_auc_score(y_test, y_prob)
                # Evaluación con umbral personalizado
                y_pred_threshold = (y_prob >= threshold).astype(int)
            except (AttributeError, IndexError):
                y_prob = None
                auc_score = None
                y_pred_threshold = y_pred
            
            report = classification_report(y_test, y_pred, output_dict=True)
            cm = confusion_matrix(y_test, y_pred)
            
            metrics = {
                "accuracy": accuracy_score(y_test, y_pred),
                "precision": precision_score(y_test, y_pred, zero_division=0),
                "recall": recall_score(y_test, y_pred, zero_division=0),
                "f1": f1_score(y_test, y_pred, zero_division=0),
                "inference_time": inference_time,
                "confusion_matrix": cm,
                "classification_report": report
            }
            
            if auc_score is not None:
                metrics["auc"] = auc_score
            
            if threshold != 0.5 and y_prob is not None:
                threshold_metrics = {
                    "threshold_accuracy": accuracy_score(y_test, y_pred_threshold),
                    "threshold_precision": precision_score(y_test, y_pred_threshold, zero_division=0),
                    "threshold_recall": recall_score(y_test, y_pred_threshold, zero_division=0),
                    "threshold_f1": f1_score(y_test, y_pred_threshold, zero_division=0),
                }
                metrics.update(threshold_metrics)
            
            evaluation_results[name] = metrics
            
            # Actualizar mejor modelo
            score = metrics["auc"] if "auc" in metrics else metrics["f1"]
            if score > self.best_score:
                self.best_score = score
                self.best_model = model
                self.best_model_name = name
                self.logger.info(f"New best model: {name} with score: {score}")
        
        return evaluation_results
    
    def cross_validate_models(self, models_dict: Dict[str, Dict], X: pd.DataFrame, y: pd.Series, preprocessor=None,
                             cv=5, scoring="roc_auc") -> Dict[str, Dict]:
        cv_results = {}
        
        for name, model_dict in models_dict.items():
            model = model_dict["model"]
            
            if preprocessor is not None:
                from sklearn.pipeline import Pipeline
                pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', model)])
                scores = cross_val_score(pipeline, X, y, cv=cv, scoring=scoring)
            else:
                scores = cross_val_score(model, X, y, cv=cv, scoring=scoring)
            
            cv_results[name] = {
                "cv_scores": scores,
                "cv_mean": np.mean(scores),
                "cv_std": np.std(scores)
            }
        
        return cv_results
    
    def get_feature_importance_summary(self, trained_models: Dict[str, Dict], top_n=10) -> pd.DataFrame:
        all_importances = []
        
        for name, model_dict in trained_models.items():
            if "feature_importance" in model_dict:
                fi_df = model_dict["feature_importance"].copy()
                fi_df = fi_df.head(top_n)
                fi_df['model'] = name
                all_importances.append(fi_df)
        
        if not all_importances:
            return pd.DataFrame()
        
        return pd.concat(all_importances)