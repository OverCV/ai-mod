# Test para entrenamiento de modelo cardiovascular

import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.data.etl.extractors import CardiovascularDataExtractor
from src.data.etl.transformers import CardiovascularTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

def test_cv_model():
    # Cargar datos
    base_path = Path(__file__).parent.parent
    data_path = base_path / "src" / "data" / "datasets" / "riesgo_cardiovascular" / "enfermedades_cardiovasculares.csv"
    
    # Extraer datos
    extractor = CardiovascularDataExtractor(data_path)
    df = extractor.extract()
    
    # Transformar datos
    transformer = CardiovascularTransformer()
    df = transformer.transform(df)
    
    # Dividir en features y target
    X = df.drop('enfermedad_cardiovascular', axis=1)
    y = df['enfermedad_cardiovascular']
    
    # Dividir en train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Escalar datos
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Entrenar modelo simple
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train_scaled, y_train)
    
    # Evaluar modelo
    y_pred = clf.predict(X_test_scaled)
    y_prob = clf.predict_proba(X_test_scaled)[:, 1]
    
    # Imprimir métricas
    print("\nReporte de clasificación:")
    print(classification_report(y_test, y_pred))
    
    try:
        auc = roc_auc_score(y_test, y_prob)
        print(f"\nAUC-ROC: {auc:.4f}")
    except Exception as e:
        print(f"Error calculando AUC: {e}")
    
    # Características importantes
    if hasattr(clf, 'feature_importances_'):
        importances = pd.DataFrame({
            'feature': X.columns,
            'importance': clf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nCaracterísticas más importantes:")
        print(importances.head(10))
    
    # Guardar modelo para uso posterior
    model_dir = base_path / "models" / "r_cardio"
    model_dir.mkdir(parents=True, exist_ok=True)
    
    import joblib
    joblib.dump(clf, model_dir / "rf_cardio_model.pkl")
    joblib.dump(scaler, model_dir / "rf_cardio_scaler.pkl")
    
    # Guardar lista de características
    with open(model_dir / "rf_cardio_features.txt", "w") as f:
        f.write("\n".join(X.columns.tolist()))
    
    print(f"\nModelo guardado en: {model_dir}")
    return clf, scaler, X.columns.tolist()

if __name__ == "__main__":
    test_cv_model()