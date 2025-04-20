# -*- coding: utf-8 -*-
import joblib
import numpy as np
from sklearn.metrics import roc_auc_score, accuracy_score, classification_report
import os
import sys
import pandas as pd

def test_models(original_model_path, optimized_model_path, test_data_path=None):
    print(f"Comparando modelos:
 - Original: {original_model_path}
 - Optimizado: {optimized_model_path}")
    
    # Verificar tamanos
    original_size = os.path.getsize(original_model_path) / (1024 * 1024)
    optimized_size = os.path.getsize(optimized_model_path) / (1024 * 1024)
    
    print(f"Tamano original: {original_size:.2f} MB")
    print(f"Tamano optimizado: {optimized_size:.2f} MB")
    print(f"Reduccion: {(1 - optimized_size/original_size) * 100:.1f}%")
    
    # Cargar modelos
    print("
Cargando modelos...")
    original_model = joblib.load(original_model_path)
    optimized_model = joblib.load(optimized_model_path)
    
    # Si no hay datos de prueba, crear datos aleatorios
    if test_data_path is None or not os.path.exists(test_data_path):
        print("
Generando datos de prueba aleatorios...")
        
        # Determinar numero de caracteristicas
        if hasattr(original_model, 'n_features_in_'):
            n_features = original_model.n_features_in_
        else:
            n_features = 10  # Valor por defecto
        
        # Generar datos aleatorios
        n_samples = 1000
        X_test = np.random.rand(n_samples, n_features)
        
        # Predecir con ambos modelos
        print("
Realizando predicciones...")
        y_pred_orig = original_model.predict(X_test)
        y_pred_opt = optimized_model.predict(X_test)
        
        # Comparar predicciones
        agreement = np.mean(y_pred_orig == y_pred_opt) * 100
        print(f"Concordancia en predicciones: {agreement:.2f}%")
    else:
        # Cargar datos de prueba reales
        print(f"
Cargando datos de prueba desde: {test_data_path}")
        data = pd.read_csv(test_data_path)
        
        # Asumir que la ultima columna es la variable objetivo
        X_test = data.iloc[:, :-1].values
        y_test = data.iloc[:, -1].values
        
        # Predecir con ambos modelos
        print("
Evaluando en datos de prueba...")
        
        # Predicciones
        y_pred_orig = original_model.predict(X_test)
        y_pred_opt = optimized_model.predict(X_test)
        
        # Probabilidades (si es clasificacion)
        if hasattr(original_model, 'predict_proba'):
            y_prob_orig = original_model.predict_proba(X_test)[:, 1]
            y_prob_opt = optimized_model.predict_proba(X_test)[:, 1]
            
            # Calcular AUC
            auc_orig = roc_auc_score(y_test, y_prob_orig)
            auc_opt = roc_auc_score(y_test, y_prob_opt)
            
            print(f"AUC original: {auc_orig:.4f}")
            print(f"AUC optimizado: {auc_opt:.4f}")
            print(f"Diferencia: {(auc_opt - auc_orig) * 100:.2f}%")
        
        # Exactitud
        acc_orig = accuracy_score(y_test, y_pred_orig)
        acc_opt = accuracy_score(y_test, y_pred_opt)
        
        print(f"Exactitud original: {acc_orig:.4f}")
        print(f"Exactitud optimizada: {acc_opt:.4f}")
        print(f"Diferencia: {(acc_opt - acc_orig) * 100:.2f}%")
        
        # Concordancia entre modelos
        agreement = np.mean(y_pred_orig == y_pred_opt) * 100
        print(f"Concordancia entre modelos: {agreement:.2f}%")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python test_optimized_model.py original_model.pkl optimized_model.pkl [test_data.csv]")
        sys.exit(1)
    
    original_file = sys.argv[1]
    optimized_file = sys.argv[2]
    test_data = sys.argv[3] if len(sys.argv) > 3 else None
    
    test_models(original_file, optimized_file, test_data)
