# Visualizaciones para análisis de modelos

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Optional, Union, Tuple
import itertools

from sklearn.metrics import roc_curve, precision_recall_curve, confusion_matrix
from sklearn.calibration import calibration_curve


def plot_confusion_matrix(
    cm: np.ndarray,
    classes: List[str],
    normalize: bool = False,
    title: str = "Confusion Matrix",
    figsize: Tuple[int, int] = (10, 8),
):
    plt.figure(figsize=figsize)

    if normalize:
        cm = cm.astype("float") / cm.sum(axis=1)[:, np.newaxis]

    sns.heatmap(
        cm,
        annot=True,
        fmt=".2f" if normalize else "d",
        cmap="Blues",
        xticklabels=classes,
        yticklabels=classes,
    )

    plt.title(title)
    plt.ylabel("Etiqueta Real")
    plt.xlabel("Etiqueta Predicha")

    return plt.gcf()


def plot_roc_curve(
    y_true: np.ndarray,
    y_prob: Union[np.ndarray, Dict[str, np.ndarray]],
    title: str = "ROC Curve",
    figsize: Tuple[int, int] = (10, 8),
):
    plt.figure(figsize=figsize)

    if isinstance(y_prob, dict):
        for name, prob in y_prob.items():
            fpr, tpr, _ = roc_curve(y_true, prob)
            auc = np.trapz(tpr, fpr)
            plt.plot(fpr, tpr, label=f"{name} (AUC = {auc:.3f})")
    else:
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        auc = np.trapz(tpr, fpr)
        plt.plot(fpr, tpr, label=f"ROC (AUC = {auc:.3f})")

    plt.plot([0, 1], [0, 1], "k--")
    plt.xlabel("Tasa de Falsos Positivos")
    plt.ylabel("Tasa de Verdaderos Positivos")
    plt.title(title)
    plt.legend(loc="lower right")

    return plt.gcf()


def plot_precision_recall(
    y_true: np.ndarray,
    y_prob: Union[np.ndarray, Dict[str, np.ndarray]],
    title: str = "Precision-Recall Curve",
    figsize: Tuple[int, int] = (10, 8),
):
    plt.figure(figsize=figsize)

    if isinstance(y_prob, dict):
        for name, prob in y_prob.items():
            precision, recall, _ = precision_recall_curve(y_true, prob)
            auc = np.trapz(precision, recall)
            plt.plot(recall, precision, label=f"{name} (AUC = {auc:.3f})")
    else:
        precision, recall, _ = precision_recall_curve(y_true, y_prob)
        auc = np.trapz(precision, recall)
        plt.plot(recall, precision, label=f"PR (AUC = {auc:.3f})")

    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title(title)
    plt.legend(loc="lower left")

    return plt.gcf()


def plot_calibration_curve(
    y_true: np.ndarray,
    y_prob: Union[np.ndarray, Dict[str, np.ndarray]],
    title: str = "Calibration Curve",
    figsize: Tuple[int, int] = (10, 8),
):
    plt.figure(figsize=figsize)

    if isinstance(y_prob, dict):
        for name, prob in y_prob.items():
            prob_true, prob_pred = calibration_curve(y_true, prob, n_bins=10)
            plt.plot(prob_pred, prob_true, "s-", label=name)
    else:
        prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=10)
        plt.plot(prob_pred, prob_true, "s-", label="Model")

    plt.plot([0, 1], [0, 1], "k--", label="Perfectly Calibrated")
    plt.xlabel("Probabilidad Media Predicha")
    plt.ylabel("Frecuencia de Positivos")
    plt.title(title)
    plt.legend(loc="lower right")

    return plt.gcf()


def plot_feature_importance(
    feature_importance: pd.DataFrame,
    top_n: int = 20,
    title: str = "Feature Importance",
    figsize: Tuple[int, int] = (12, 8),
):
    n_features = min(top_n, len(feature_importance))
    top_features = feature_importance.head(n_features).copy()

    plt.figure(figsize=figsize)
    sns.barplot(x="importance", y="feature", data=top_features)
    plt.title(title)
    plt.xlabel("Importancia")
    plt.ylabel("Característica")

    return plt.gcf()


def plot_correlation_matrix(df: pd.DataFrame, figsize: Tuple[int, int] = (12, 10)):
    corr = df.corr()

    plt.figure(figsize=figsize)
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(
        corr,
        mask=mask,
        cmap="coolwarm",
        annot=True,
        fmt=".2f",
        square=True,
        linewidths=0.5,
        cbar_kws={"shrink": 0.5},
    )
    plt.title("Matriz de Correlación")

    return plt.gcf()


def plot_model_comparison(
    model_results: Dict[str, Dict],
    metric: str = "auc",
    figsize: Tuple[int, int] = (10, 6),
):
    results = {
        model: data[metric] for model, data in model_results.items() if metric in data
    }
    models = list(results.keys())
    values = list(results.values())

    plt.figure(figsize=figsize)
    plt.bar(models, values)
    plt.xlabel("Modelo")
    plt.ylabel(f"Métrica: {metric}")
    plt.title(f"Comparación de Modelos por {metric}")
    plt.xticks(rotation=45)

    # Añadir valores en las barras
    for i, v in enumerate(values):
        plt.text(i, v, f"{v:.3f}", ha="center", va="bottom")

    return plt.gcf()
