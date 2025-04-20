# Pipeline para modelos de riesgo cardiovascular

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import time

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import xgboost as xgb
from lightgbm import LGBMClassifier

from src.data.etl.extractors import CardiovascularDataExtractor
from src.data.etl.transformers import CardiovascularTransformer
from src.data.preprocessing.feature_engineering import CardiovascularFeatureEngineer
from src.data.validation.data_quality import CardiovascularDataQuality
from src.data.validation.schema_validator import CardiovascularDataValidator
from src.config.settings import RiesgoCardiovascularConfig
from src.models.base import ClassificationModelBase

class RiesgoCardiovascularPipeline(ClassificationModelBase):
    def __init__(self, config=None):
        self.config = config or RiesgoCardiovascularConfig()
        super().__init__(self.config)
        self.model_results = {}
        base_path = Path(__file__).parent.parent.parent.parent
        self.dataset_path = base_path / "src" / "data" / "datasets" / "riesgo_cardiovascular"
        
    def load_and_prepare_data(self, file_name="enfermedades_cardiovasculares.csv"):
        file_path = self.dataset_path / file_name
        extractor = CardiovascularDataExtractor(file_path)
        df = extractor.extract()
        
        transformer = CardiovascularTransformer(impute_missing=True, compute_bmi=True)
        df = transformer.transform(df)
        
        validator = CardiovascularDataValidator()
        validation_errors = validator.validate(df)
        if validation_errors:
            print(f"Errors in data validation: {validation_errors}")
        
        quality_checker = CardiovascularDataQuality()
        quality_report = quality_checker.generate_report(df, target_column="enfermedad_cardiovascular")
        print(f"Data quality report: {quality_report}")
        
        feature_engineer = CardiovascularFeatureEngineer(
            features_to_create=["imc_categoria", "hipertension", "presion_media", "presion_diferencial"]
        )
        df = feature_engineer.transform(df)
        
        X = df.drop(columns=["enfermedad_cardiovascular"])
        y = df["enfermedad_cardiovascular"]
        
        return X, y
    
    def create_preprocessing_pipeline(self, X):
        numeric_features = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
        categorical_features = X.select_dtypes(include=["object"]).columns.tolist()
        
        numeric_transformer = Pipeline(steps=[
            ("scaler", StandardScaler())
        ])
        
        categorical_transformer = Pipeline(steps=[
            ("onehot", OneHotEncoder(handle_unknown="ignore"))
        ])
        
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numeric_features),
                ("cat", categorical_transformer, categorical_features)
            ]
        )
        
        return preprocessor
    
    def train_and_evaluate(self):
        X, y = self.load_and_prepare_data()
        
        # División en train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=self.config.test_size, random_state=self.config.random_state
        )
        
        # Creación del preprocesador
        preprocessor = self.create_preprocessing_pipeline(X)
        
        # Definición de modelos - empezar con un conjunto más simple para pruebas
        models = {
            "random_forest": RandomForestClassifier(n_estimators=100, random_state=self.config.random_state),
            "logistic_regression": LogisticRegression(max_iter=1000, random_state=self.config.random_state)
        }
        
        # Entrenamiento y evaluación de modelos
        for name, model in models.items():
            pipeline = Pipeline(steps=[
                ("preprocessor", preprocessor),
                ("classifier", model)
            ])
            
            # Registrar tiempo de entrenamiento
            start_time = time.time()
            pipeline.fit(X_train, y_train)
            train_time = time.time() - start_time
            
            # Predicciones
            y_pred = pipeline.predict(X_test)
            y_prob = pipeline.predict_proba(X_test)[:, 1]
            
            # Métricas
            report = classification_report(y_test, y_pred, output_dict=True)
            try:
                auc = roc_auc_score(y_test, y_prob)
            except Exception as e:
                print(f"Error al calcular AUC: {e}")
                auc = 0.5  # Valor por defecto
            conf_matrix = confusion_matrix(y_test, y_pred)
            
            # Cross-validation
            try:
                cv_scores = cross_val_score(pipeline, X, y, cv=min(self.config.cv_folds, 3), scoring="f1")
            except Exception as e:
                print(f"Error en cross-validation: {e}")
                cv_scores = np.array([0.0])
            
            # Guardar resultados
            self.models[name] = pipeline
            self.preprocessors[name] = preprocessor
            
            # Importancia de características para modelos con esta capacidad
            if hasattr(model, "feature_importances_"):
                try:
                    # Acceder a feature_importances_ directamente sin reprocesar
                    importances = model.feature_importances_
                    if len(importances) == len(X.columns):
                        feature_names = X.columns.tolist()
                        feature_importance = pd.DataFrame({
                            "feature": feature_names,
                            "importance": importances
                        })
                        feature_importance = feature_importance.sort_values("importance", ascending=False)
                        self.feature_importances[name] = feature_importance
                except Exception as e:
                    print(f"Error al obtener importancia de características: {e}")
            
            self.model_results[name] = {
                "accuracy": report["accuracy"],
                "precision": report["1"]["precision"],
                "recall": report["1"]["recall"],
                "f1": report["1"]["f1-score"],
                "auc": auc,
                "cv_mean": np.mean(cv_scores),
                "cv_std": np.std(cv_scores),
                "train_time": train_time,
                "confusion_matrix": conf_matrix.tolist()
            }
        
        # Encontrar el mejor modelo
        try:
            best_model = max(self.model_results.items(), key=lambda x: x[1].get("auc", 0))[0]
        except ValueError:
            # Si no hay modelos válidos, usar el primero
            best_model = next(iter(self.model_results))
        print(f"Best model: {best_model} with AUC: {self.model_results[best_model]['auc']}")
        
        # Guardar el mejor modelo
        self.save_model(best_model, self.config.model_output_path / f"cardio_model.pkl")
        
        # Guardar la importancia de características del mejor modelo
        if best_model in self.feature_importances:
            self.save_features(best_model, self.config.model_output_path / "feature_importance.csv")
        
        # Guardar los nombres de las características
        with open(self.config.model_output_path / "cardio_features.txt", "w") as f:
            f.write("\n".join(X.columns.tolist()))
        
        return self.model_results
    
    def optimize_hyperparameters(self, model_name="xgboost"):
        X, y = self.load_and_prepare_data()
        
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=self.config.validation_size, random_state=self.config.random_state
        )
        
        preprocessor = self.create_preprocessing_pipeline(X)
        
        param_grids = {
            "logistic_regression": {
                "classifier__C": [0.001, 0.01, 0.1, 1, 10, 100],
                "classifier__penalty": ["l1", "l2"],
                "classifier__solver": ["liblinear", "saga"]
            },
            "random_forest": {
                "classifier__n_estimators": [100, 200, 300],
                "classifier__max_depth": [None, 5, 10, 15],
                "classifier__min_samples_split": [2, 5, 10],
                "classifier__min_samples_leaf": [1, 2, 4]
            },
            "xgboost": {
                "classifier__n_estimators": [100, 200, 300],
                "classifier__max_depth": [3, 5, 7],
                "classifier__learning_rate": [0.01, 0.05, 0.1],
                "classifier__subsample": [0.8, 0.9, 1.0],
                "classifier__colsample_bytree": [0.8, 0.9, 1.0]
            },
            "lightgbm": {
                "classifier__n_estimators": [100, 200, 300],
                "classifier__num_leaves": [31, 50, 70],
                "classifier__learning_rate": [0.01, 0.05, 0.1],
                "classifier__subsample": [0.8, 0.9, 1.0],
                "classifier__colsample_bytree": [0.8, 0.9, 1.0]
            }
        }
        
        if model_name not in param_grids:
            raise ValueError(f"No parameter grid defined for model: {model_name}")
        
        # Crear base model
        if model_name == "logistic_regression":
            model = LogisticRegression(random_state=self.config.random_state)
        elif model_name == "random_forest":
            model = RandomForestClassifier(random_state=self.config.random_state)
        elif model_name == "xgboost":
            model = xgb.XGBClassifier(random_state=self.config.random_state)
        elif model_name == "lightgbm":
            model = LGBMClassifier(random_state=self.config.random_state)
        
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("classifier", model)
        ])
        
        # Grid search
        grid_search = GridSearchCV(
            pipeline,
            param_grids[model_name],
            cv=self.config.cv_folds,
            scoring="roc_auc",
            n_jobs=self.config.n_jobs,
            verbose=self.config.verbose
        )
        
        grid_search.fit(X_train, y_train)
        
        # Evaluar mejor modelo
        best_model = grid_search.best_estimator_
        
        y_pred = best_model.predict(X_val)
        y_prob = best_model.predict_proba(X_val)[:, 1]
        
        # Métricas
        report = classification_report(y_val, y_pred, output_dict=True)
        auc = roc_auc_score(y_val, y_prob)
        
        # Importancia de características
        if hasattr(best_model.named_steps["classifier"], "feature_importances_"):
            feature_names = X.columns.tolist()
            feature_importance = pd.DataFrame({
                "feature": feature_names,
                "importance": best_model.named_steps["classifier"].feature_importances_
            })
            feature_importance = feature_importance.sort_values("importance", ascending=False)
            self.feature_importances[f"{model_name}_optimized"] = feature_importance
        
        # Guardar modelo optimizado
        self.models[f"{model_name}_optimized"] = best_model
        self.preprocessors[f"{model_name}_optimized"] = preprocessor
        
        optimized_results = {
            "best_params": grid_search.best_params_,
            "accuracy": report["accuracy"],
            "precision": report["1"]["precision"],
            "recall": report["1"]["recall"],
            "f1": report["1"]["f1-score"],
            "auc": auc
        }
        
        self.model_results[f"{model_name}_optimized"] = optimized_results
        
        # Guardar modelo optimizado
        self.save_model(f"{model_name}_optimized", self.config.model_output_path / f"cardio_model_optimized.pkl")
        
        return optimized_results