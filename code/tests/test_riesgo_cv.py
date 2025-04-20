# Test para el pipeline de riesgo cardiovascular

import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.riesgo_cardiovascular.pipeline import RiesgoCardiovascularPipeline
from src.config.settings import RiesgoCardiovascularConfig
from src.data.etl.extractors import CardiovascularDataExtractor
from src.data.validation.data_quality import CardiovascularDataQuality
from src.utils.visualizations import plot_feature_importance, plot_roc_curve, plot_confusion_matrix

def test_load_data():
    config = RiesgoCardiovascularConfig()
    pipeline = RiesgoCardiovascularPipeline(config)
    X, y = pipeline.load_and_prepare_data()
    
    print(f"Dimensiones de X: {X.shape}")
    print(f"Dimensiones de y: {y.shape}")
    print(f"Distribución de clases: {y.value_counts()}")
    print(f"Columnas de X: {X.columns.tolist()}")
    
    return X, y

def test_train_simple_model(X, y):
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    print("\nReporte de clasificación:")
    print(classification_report(y_test, y_pred))
    
    return model, X_test, y_test

def test_feature_importance(model, X):
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nImportancia de características:")
    print(feature_importance.head(10))
    
    return feature_importance

def test_pipeline():
    config = RiesgoCardiovascularConfig()
    pipeline = RiesgoCardiovascularPipeline(config)
    
    results = pipeline.train_and_evaluate()
    
    print("\nResultados de entrenamiento:")
    for model_name, metrics in results.items():
        auc = metrics.get('auc', 0)
        f1 = metrics.get('f1', 0)
        print(f"{model_name}: AUC={auc:.4f}, F1={f1:.4f}")
    
    return pipeline, results

def main():
    print("Ejecutando pruebas de riesgo cardiovascular...\n")
    
    # Cargar datos
    X, y = test_load_data()
    
    # Probar un modelo simple
    model, X_test, y_test = test_train_simple_model(X, y)
    
    # Analizar importancia de características
    feature_importance = test_feature_importance(model, X)
    
    # Probar pipeline completo
    pipeline, results = test_pipeline()
    
    print("\nPruebas completadas.")

if __name__ == "__main__":
    main()