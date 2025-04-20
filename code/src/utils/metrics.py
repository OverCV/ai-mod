# Métricas comunes para evaluación de modelos

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Union, Tuple, Callable

from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.calibration import calibration_curve

def classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, 
                         y_prob: Optional[np.ndarray] = None) -> Dict[str, Union[float, List]]:
    metrics = {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, zero_division=0),
        'recall': recall_score(y_true, y_pred, zero_division=0),
        'f1': f1_score(y_true, y_pred, zero_division=0),
        'confusion_matrix': confusion_matrix(y_true, y_pred).tolist(),
        'report': classification_report(y_true, y_pred, output_dict=True)
    }
    
    if y_prob is not None:
        metrics['roc_auc'] = roc_auc_score(y_true, y_prob)
    
    return metrics

def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    metrics = {
        'mse': mean_squared_error(y_true, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
        'mae': mean_absolute_error(y_true, y_pred),
        'r2': r2_score(y_true, y_pred)
    }
    
    return metrics

def threshold_optimization(y_true: np.ndarray, y_prob: np.ndarray, 
                          metric_func: Callable = f1_score, 
                          thresholds: Optional[np.ndarray] = None) -> Tuple[float, Dict]:
    if thresholds is None:
        thresholds = np.arange(0.1, 1.0, 0.05)
    
    results = []
    for threshold in thresholds:
        y_pred = (y_prob >= threshold).astype(int)
        score = metric_func(y_true, y_pred)
        
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        results.append({
            'threshold': threshold,
            'score': score,
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'tn': tn
        })
    
    results_df = pd.DataFrame(results)
    best_idx = results_df['score'].idxmax()
    best_threshold = results_df.loc[best_idx, 'threshold']
    
    return best_threshold, results_df

def calibration_metrics(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> Dict:
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins)
    
    # Calcular error de calibración
    calib_error = np.mean((prob_true - prob_pred) ** 2)
    
    return {
        'prob_true': prob_true.tolist(),
        'prob_pred': prob_pred.tolist(),
        'calib_error': calib_error
    }

def clinical_metrics(y_true: np.ndarray, y_pred: np.ndarray, 
                    y_prob: Optional[np.ndarray] = None, 
                    risk_threshold: float = 0.2) -> Dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    ppv = tp / (tp + fp) if (tp + fp) > 0 else 0
    npv = tn / (tn + fn) if (tn + fn) > 0 else 0
    
    metrics = {
        'sensitivity': sensitivity,  # Igual a recall
        'specificity': specificity,
        'ppv': ppv,  # Valor predictivo positivo (igual a precision)
        'npv': npv,  # Valor predictivo negativo
        'diagnostic_odds_ratio': (tp * tn) / (fp * fn) if (fp * fn) > 0 else np.inf
    }
    
    if y_prob is not None:
        # Calcular métricas con umbral clínico
        y_pred_clinical = (y_prob >= risk_threshold).astype(int)
        
        tn_c, fp_c, fn_c, tp_c = confusion_matrix(y_true, y_pred_clinical).ravel()
        sensitivity_c = tp_c / (tp_c + fn_c) if (tp_c + fn_c) > 0 else 0
        specificity_c = tn_c / (tn_c + fp_c) if (tn_c + fp_c) > 0 else 0
        
        metrics.update({
            'clinical_sensitivity': sensitivity_c,
            'clinical_specificity': specificity_c
        })
    
    return metrics