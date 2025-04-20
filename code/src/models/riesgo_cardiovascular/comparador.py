# Comparador de modelos cardiovasculares

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import joblib
import time

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    f1_score,
)

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import xgboost as xgb
from lightgbm import LGBMClassifier

import sys
import os
from pathlib import Path

# Añadir directorio raíz al path para poder importar los módulos
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.data.etl.extractors import CardiovascularDataExtractor
from src.data.etl.transformers import CardiovascularTransformer
from src.data.preprocessing.feature_engineering import CardiovascularFeatureEngineer
from src.utils.visualizations import (
    plot_roc_curve,
    plot_confusion_matrix,
    plot_feature_importance,
)


class ModelosComparador:
    def __init__(self, dataset_path=None, model_output_path=None, random_state=42):
        if dataset_path is None:
            self.dataset_path = (
                Path(__file__).parent.parent.parent.parent
                / "src"
                / "data"
                / "datasets"
                / "riesgo_cardiovascular"
                / "enfermedades_cardiovasculares.csv"
            )
        else:
            self.dataset_path = Path(dataset_path)

        if model_output_path is None:
            self.model_output_path = (
                Path(__file__).parent.parent.parent.parent / "models" / "r_cardio"
            )
        else:
            self.model_output_path = Path(model_output_path)

        self.model_output_path.mkdir(parents=True, exist_ok=True)
        self.random_state = random_state
        self.resultados = {}
        self.mejor_modelo = None
        self.mejor_nombre = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.scaler = None
        self.feature_names = None

    def cargar_datos(self):
        extractor = CardiovascularDataExtractor(self.dataset_path)
        df = extractor.extract()

        transformer = CardiovascularTransformer()
        df = transformer.transform(df)

        feature_engineer = CardiovascularFeatureEngineer(
            features_to_create=["presion_media", "presion_diferencial", "hipertension"]
        )
        df = feature_engineer.transform(df)

        X = df.drop("enfermedad_cardiovascular", axis=1)
        y = df["enfermedad_cardiovascular"]

        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.random_state
        )

        self.feature_names = X.columns.tolist()

        self.scaler = StandardScaler()
        return X, y

    def entrenar_modelo(self, model_name, model, X_train, y_train, X_test, y_test):
        start_time = time.time()

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        model.fit(X_train_scaled, y_train)

        train_time = time.time() - start_time

        y_pred = model.predict(X_test_scaled)
        y_prob = model.predict_proba(X_test_scaled)[:, 1]

        report = classification_report(y_test, y_pred, output_dict=True)
        conf = confusion_matrix(y_test, y_pred)
        auc = roc_auc_score(y_test, y_prob)
        f1 = f1_score(y_test, y_pred)

        resultado = {
            "modelo": model,
            "train_time": train_time,
            "accuracy": report["accuracy"],
            "precision": report["1"]["precision"],
            "recall": report["1"]["recall"],
            "f1": f1,
            "auc": auc,
            "conf_matrix": conf,
            "y_pred": y_pred,
            "y_prob": y_prob,
        }

        if hasattr(model, "feature_importances_"):
            feature_importance = pd.DataFrame(
                {
                    "feature": self.feature_names,
                    "importance": model.feature_importances_,
                }
            ).sort_values("importance", ascending=False)
            resultado["feature_importance"] = feature_importance

        return resultado

    def comparar_modelos(self):
        X, y = self.cargar_datos()

        modelos = {
            "logistic_regression": LogisticRegression(
                max_iter=1000, random_state=self.random_state
            ),
            "random_forest": RandomForestClassifier(
                n_estimators=100, random_state=self.random_state
            ),
            "gradient_boosting": GradientBoostingClassifier(
                n_estimators=100, random_state=self.random_state
            ),
            "xgboost": xgb.XGBClassifier(
                n_estimators=100, random_state=self.random_state
            ),
        }

        for nombre, modelo in modelos.items():
            print(f"Entrenando modelo: {nombre}")
            resultado = self.entrenar_modelo(
                nombre, modelo, self.X_train, self.y_train, self.X_test, self.y_test
            )
            self.resultados[nombre] = resultado

        # Encontrar el mejor modelo
        mejor_score = 0
        for nombre, resultado in self.resultados.items():
            if resultado["auc"] > mejor_score:
                mejor_score = resultado["auc"]
                self.mejor_nombre = nombre
                self.mejor_modelo = resultado["modelo"]

        print(f"\nMejor modelo: {self.mejor_nombre} con AUC: {mejor_score:.4f}")

        tabla_comparativa = pd.DataFrame(
            {
                nombre: {
                    "accuracy": res["accuracy"],
                    "precision": res["precision"],
                    "recall": res["recall"],
                    "f1": res["f1"],
                    "auc": res["auc"],
                    "tiempo_entrenamiento": res["train_time"],
                }
                for nombre, res in self.resultados.items()
            }
        ).T

        print("\nTabla comparativa:")
        print(tabla_comparativa.round(4))

        # Guardar resultados
        tabla_comparativa.to_csv(self.model_output_path / "comparativa_modelos.csv")

        # Guardar mejor modelo
        joblib.dump(self.mejor_modelo, self.model_output_path / "mejor_modelo.pkl")
        joblib.dump(self.scaler, self.model_output_path / "scaler.pkl")

        # Guardar lista de características
        with open(self.model_output_path / "features.txt", "w") as f:
            f.write("\n".join(self.feature_names))

        # Guardar importancia de características si está disponible
        if "feature_importance" in self.resultados[self.mejor_nombre]:
            self.resultados[self.mejor_nombre]["feature_importance"].to_csv(
                self.model_output_path / "feature_importance.csv", index=False
            )

        return tabla_comparativa, self.mejor_modelo, self.mejor_nombre

    def generar_graficos(self):
        if not self.resultados:
            print("Ejecuta primero comparar_modelos() para generar resultados")
            return

        # Gráfico ROC-AUC para todos los modelos
        plt.figure(figsize=(10, 8))
        for nombre, resultado in self.resultados.items():
            from sklearn.metrics import roc_curve

            fpr, tpr, _ = roc_curve(self.y_test, resultado["y_prob"])
            plt.plot(fpr, tpr, label=f"{nombre} (AUC = {resultado['auc']:.4f})")

        plt.plot([0, 1], [0, 1], "k--")
        plt.xlabel("Tasa de Falsos Positivos")
        plt.ylabel("Tasa de Verdaderos Positivos")
        plt.title("Curvas ROC")
        plt.legend()
        plt.savefig(self.model_output_path / "roc_curves.png")

        # Matriz de confusión del mejor modelo
        if self.mejor_nombre:
            cm = self.resultados[self.mejor_nombre]["conf_matrix"]
            plt.figure(figsize=(8, 6))
            sns.heatmap(
                cm,
                annot=True,
                fmt="d",
                cmap="Blues",
                xticklabels=["No Riesgo", "Riesgo"],
                yticklabels=["No Riesgo", "Riesgo"],
            )
            plt.title(f"Matriz de Confusión - {self.mejor_nombre}")
            plt.ylabel("Verdadero")
            plt.xlabel("Predicho")
            plt.savefig(self.model_output_path / "matriz_confusion.png")

            # Importancia de características
            if "feature_importance" in self.resultados[self.mejor_nombre]:
                importances = self.resultados[self.mejor_nombre]["feature_importance"]
                plt.figure(figsize=(10, 8))
                sns.barplot(x="importance", y="feature", data=importances.head(10))
                plt.title(f"Top 10 Características Importantes - {self.mejor_nombre}")
                plt.tight_layout()
                plt.savefig(self.model_output_path / "feature_importance.png")


def main():
    comparador = ModelosComparador()
    tabla, mejor_modelo, mejor_nombre = comparador.comparar_modelos()

    try:
        comparador.generar_graficos()
    except Exception as e:
        print(f"Error generando gráficos: {e}")

    print(
        f"\nProceso completado. Archivos guardados en: {comparador.model_output_path}"
    )
    return comparador


if __name__ == "__main__":
    main()
