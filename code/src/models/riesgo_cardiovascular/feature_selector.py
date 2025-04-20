# Selector de características para modelos cardiovasculares

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional, Union
from sklearn.feature_selection import SelectKBest, f_classif, RFE, mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

class FeatureSelector:
    def __init__(self, method='mi', k=10):
        self.method = method
        self.k = k
        self.selector = None
        self.selected_features = None
        self.feature_scores = None
        self.feature_ranks = None
    
    def fit(self, X: pd.DataFrame, y: pd.Series) -> 'FeatureSelector':
        if self.method == 'kbest':
            self.selector = SelectKBest(f_classif, k=min(self.k, X.shape[1]))
            self.selector.fit(X, y)
            self.feature_scores = pd.DataFrame({
                'feature': X.columns,
                'score': self.selector.scores_
            }).sort_values('score', ascending=False)
        
        elif self.method == 'mi':
            scores = mutual_info_classif(X, y)
            self.feature_scores = pd.DataFrame({
                'feature': X.columns,
                'score': scores
            }).sort_values('score', ascending=False)
            
            # Crear selector similar a SelectKBest
            top_features = self.feature_scores.head(min(self.k, X.shape[1]))['feature'].tolist()
            mask = X.columns.isin(top_features)
            self.selector = lambda X: X[top_features]
            
        elif self.method == 'rfe':
            base_model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.selector = RFE(base_model, n_features_to_select=min(self.k, X.shape[1]))
            self.selector.fit(X, y)
            self.feature_ranks = pd.DataFrame({
                'feature': X.columns,
                'rank': self.selector.ranking_
            }).sort_values('rank')
            
        elif self.method == 'pca':
            # PCA requiere datos escalados
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            self.selector = PCA(n_components=min(self.k, X.shape[1]))
            self.selector.fit(X_scaled)
            
            # Matriz de componentes
            components_df = pd.DataFrame(
                self.selector.components_,
                columns=X.columns
            )
            self.feature_scores = pd.DataFrame({
                'feature': X.columns,
                'importance': np.sum(np.abs(components_df), axis=0)
            }).sort_values('importance', ascending=False)
        
        # Obtener las características seleccionadas
        if self.method == 'kbest':
            selected_indices = self.selector.get_support(indices=True)
            self.selected_features = X.columns[selected_indices].tolist()
        elif self.method == 'mi':
            self.selected_features = self.feature_scores.head(min(self.k, X.shape[1]))['feature'].tolist()
        elif self.method == 'rfe':
            self.selected_features = self.feature_ranks[self.feature_ranks['rank'] == 1]['feature'].tolist()
        elif self.method == 'pca':
            # Para PCA no hay características seleccionadas, son transformaciones
            self.selected_features = self.feature_scores.head(min(self.k, X.shape[1]))['feature'].tolist()
        
        return self
    
    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if self.method == 'pca':
            # PCA requiere escalado
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            return pd.DataFrame(
                self.selector.transform(X_scaled),
                index=X.index,
                columns=[f'PC{i+1}' for i in range(self.k)]
            )
        elif self.method == 'mi':
            return self.selector(X)
        else:
            return pd.DataFrame(self.selector.transform(X), index=X.index, columns=self.selected_features)
    
    def fit_transform(self, X: pd.DataFrame, y: pd.Series) -> pd.DataFrame:
        self.fit(X, y)
        return self.transform(X)

class CardioFeatureSelector(FeatureSelector):
    def __init__(self, method='mi', k=10, correlation_threshold=0.7):
        super().__init__(method, k)
        self.correlation_threshold = correlation_threshold
        self.correlations = None
        self.clinical_knowledge = {
            'edad': 'high',
            'presion_sistolica': 'high',
            'presion_diastolica': 'high',
            'colesterol': 'high',
            'imc': 'medium',
            'tabaco': 'high',
            'glucosa': 'medium'
        }
    
    def remove_correlated_features(self, X: pd.DataFrame) -> pd.DataFrame:
        corr_matrix = X.corr().abs()
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        to_drop = [column for column in upper.columns if any(upper[column] > self.correlation_threshold)]
        
        # Guardar matriz de correlación para análisis
        self.correlations = corr_matrix
        
        return X.drop(columns=to_drop)
    
    def fit(self, X: pd.DataFrame, y: pd.Series) -> 'CardioFeatureSelector':
        # Primero eliminar características altamente correlacionadas
        X_uncorrelated = self.remove_correlated_features(X)
        
        # Aplicar método de selección
        super().fit(X_uncorrelated, y)
        
        # Incluir características médicamente relevantes incluso si no fueron seleccionadas por la técnica
        high_importance_features = [f for f, imp in self.clinical_knowledge.items() if imp == 'high' and f in X.columns]
        for feature in high_importance_features:
            if feature not in self.selected_features and feature in X.columns:
                self.selected_features.append(feature)
        
        return self