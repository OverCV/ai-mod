# -*- coding: utf-8 -*-
import joblib
import numpy as np
import os
import sys

def optimize_rf_model(input_path, output_path, max_trees=50):
    print(f"Optimizando modelo en: {input_path}")
    # Obtener tamano original
    original_size = os.path.getsize(input_path) / (1024 * 1024)
    print(f"Tamano original: {original_size:.2f} MB")
    
    # Cargar modelo
    model = joblib.load(input_path)
    
    # Verificar que sea un RandomForest
    if hasattr(model, 'estimators_'):
        num_trees = len(model.estimators_)
        print(f"Arboles original: {num_trees}")
        
        # Seleccionar arboles importantes
        if num_trees > max_trees:
            print(f"Reduciendo a {max_trees} arboles...")
            
            # Calcular importancia de arboles
            tree_importances = []
            for tree in model.estimators_:
                if hasattr(tree, 'feature_importances_'):
                    tree_importances.append(np.mean(tree.feature_importances_))
                else:
                    tree_importances.append(0.0)
            
            # Indices de arboles importantes
            indices = np.argsort(tree_importances)[::-1][:max_trees]
            
            # Crear modelo optimizado
            from sklearn.ensemble import RandomForestClassifier
            optimized = RandomForestClassifier(n_estimators=max_trees)
            
            # Copiar atributos clave
            for attr in ['n_features_in_', 'classes_', 'n_classes_']:
                if hasattr(model, attr):
                    setattr(optimized, attr, getattr(model, attr))
            
            # Copiar arboles seleccionados
            optimized.estimators_ = [model.estimators_[i] for i in indices]
        else:
            optimized = model
    else:
        print("No es un modelo RandomForest")
        optimized = model
    
    # Guardar modelo optimizado con compresion maxima
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(optimized, output_path, compress=9)
    
    # Verificar tamano optimizado
    final_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Tamano optimizado: {final_size:.2f} MB")
    print(f"Reduccion: {(1 - final_size/original_size) * 100:.1f}%")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python optimizer.py input_model.pkl output_model.pkl [max_trees]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    max_trees = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    
    optimize_rf_model(input_file, output_file, max_trees)
