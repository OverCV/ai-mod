# Evaluador de modelos de riesgo cardiovascular

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple, Optional, Union
from pathlib import Path

from sklearn.metrics import roc_curve, precision_recall_curve, auc
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.calibration import calibration_curve
from sklearn.inspection import permutation_importance

from src.config.settings import RiesgoCardiovascularConfig
from src.config.logging_config import get_model_logger

class CardiovascularModelEvaluator:
    def __init__(self, config=None):
        self.config = config or RiesgoCardiovascularConfig()
        self.logger = get_model_logger("riesgo_cardiovascular")
        self.evaluation_results = {}
    
    def calculate_metrics(self, y_true: pd.Series, y_pred: np.ndarray, y_prob: Optional[np.ndarray] = None) -> Dict:
        metrics = {
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
            "classification_report": classification_report(y_true, y_pred, output_dict=True),
        }
        
        if y_prob is not None:
            # ROC curve data
            fpr, tpr, _ = roc_curve(y_true, y_prob)
            metrics["roc_auc"] = auc(fpr, tpr)
            metrics["roc_curve"] = {"fpr": fpr.tolist(), "tpr": tpr.tolist()}
            
            # Precision-Recall curve data
            precision, recall, _ = precision_recall_curve(y_true, y_prob)
            metrics["pr_auc"] = auc(recall, precision)
            metrics["pr_curve"] = {"precision": precision.tolist(), "recall": recall.tolist()}
            
            # Calibration curve
            prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=10)
            metrics["calibration_curve"] = {"prob_true": prob_true.tolist(), "prob_pred": prob_pred.tolist()}
        
        return metrics
    
    def evaluate_feature_importance(self, model, X: pd.DataFrame, y: pd.Series, preprocessor=None, 
                                   n_repeats=10, random_state=None) -> pd.DataFrame:
        if preprocessor is not None:
            X_processed = preprocessor.transform(X)
        else:
            X_processed = X
        
        result = permutation_importance(
            model, X_processed, y, n_repeats=n_repeats, random_state=random_state or self.config.random_state
        )
        
        importances = pd.DataFrame({
            'feature': X.columns,
            'importance': result.importances_mean,
            'std': result.importances_std
        }).sort_values('importance', ascending=False)
        
        return importances
    
    def compare_models(self, models_metrics: Dict[str, Dict], key_metric="roc_auc") -> pd.DataFrame:
        comparison = {}
        for model_name, metrics in models_metrics.items():
            comparison[model_name] = {
                metric: value for metric, value in metrics.items() 
                if not isinstance(value, dict) and not isinstance(value, list)
            }
        
        comparison_df = pd.DataFrame.from_dict(comparison, orient="index")
        
        if key_metric in comparison_df.columns:
            comparison_df = comparison_df.sort_values(key_metric, ascending=False)
        
        return comparison_df
    
    def generate_error_analysis(self, X: pd.DataFrame, y_true: pd.Series, y_pred: np.ndarray, 
                               y_prob: Optional[np.ndarray] = None) -> pd.DataFrame:
        analysis_df = X.copy()
        analysis_df["true_label"] = y_true
        analysis_df["predicted_label"] = y_pred
        analysis_df["correct"] = (y_true == y_pred).astype(int)
        
        if y_prob is not None:
            analysis_df["confidence"] = np.where(y_pred == 1, y_prob, 1 - y_prob)
        
        # Añadir tipo de error
        analysis_df["error_type"] = "none"
        analysis_df.loc[(y_true == 1) & (y_pred == 0), "error_type"] = "falso_negativo"
        analysis_df.loc[(y_true == 0) & (y_pred == 1), "error_type"] = "falso_positivo"
        
        return analysis_df
    
    def analyze_subgroup_performance(self, error_analysis: pd.DataFrame, 
                                    subgroup_columns: List[str]) -> Dict[str, pd.DataFrame]:
        results = {}
        
        for col in subgroup_columns:
            if col in error_analysis.columns:
                # Análisis por grupo
                subgroup_metrics = error_analysis.groupby(col)[
                    ["correct", "true_label", "predicted_label"]
                ].agg({
                    "correct": "mean",
                    "true_label": ["count", "mean"],
                    "predicted_label": "mean"
                })
                
                subgroup_metrics.columns = [
                    "accuracy", "count", "positive_rate_true", "positive_rate_pred"
                ]
                
                results[col] = subgroup_metrics
        
        return results
    
    def find_optimal_threshold(self, y_true: pd.Series, y_prob: np.ndarray, 
                              metric="f1", thresholds=None) -> Tuple[float, Dict]:
        if thresholds is None:
            thresholds = np.arange(0.1, 1.0, 0.05)
        
        results = []
        for threshold in thresholds:
            y_pred = (y_prob >= threshold).astype(int)
            
            tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            accuracy = (tp + tn) / (tp + tn + fp + fn)
            
            results.append({
                "threshold": threshold,
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "tn": tn
            })
        
        results_df = pd.DataFrame(results)
        optimal_row = results_df.loc[results_df[metric].idxmax()]
        
        return optimal_row["threshold"], results_df