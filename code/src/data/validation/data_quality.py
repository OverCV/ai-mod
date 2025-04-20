# Validaciones de calidad de datos

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Union, Tuple

class DataQualityChecker:
    def __init__(self):
        pass
    
    def check_missing_values(self, df: pd.DataFrame) -> Dict[str, float]:
        missing_percentages = {}
        for column in df.columns:
            missing_pct = df[column].isna().mean() * 100
            if missing_pct > 0:
                missing_percentages[column] = missing_pct
        return missing_percentages
    
    def check_outliers(self, df: pd.DataFrame, columns: List[str] = None, method: str = 'iqr', threshold: float = 1.5) -> Dict[str, int]:
        columns = columns or df.select_dtypes(include=np.number).columns.tolist()
        outlier_counts = {}
        
        for column in columns:
            if method == 'iqr':
                Q1 = df[column].quantile(0.25)
                Q3 = df[column].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR
                outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
            elif method == 'zscore':
                z_scores = np.abs((df[column] - df[column].mean()) / df[column].std())
                outliers = df[z_scores > threshold]
            else:
                raise ValueError(f"Método de detección de outliers no soportado: {method}")
            
            if len(outliers) > 0:
                outlier_counts[column] = len(outliers)
        
        return outlier_counts
    
    def check_duplicates(self, df: pd.DataFrame, subset: List[str] = None) -> int:
        return df.duplicated(subset=subset).sum()
    
    def check_class_imbalance(self, df: pd.DataFrame, target_column: str) -> Dict[str, float]:
        value_counts = df[target_column].value_counts(normalize=True) * 100
        return value_counts.to_dict()
    
    def generate_report(self, df: pd.DataFrame, target_column: str = None) -> Dict[str, Dict]:
        report = {}
        
        # Verificar valores faltantes
        missing_values = self.check_missing_values(df)
        if missing_values:
            report['missing_values'] = missing_values
        
        # Verificar outliers
        numeric_columns = df.select_dtypes(include=np.number).columns.tolist()
        if target_column in numeric_columns:
            numeric_columns.remove(target_column)
        
        outliers = self.check_outliers(df, numeric_columns)
        if outliers:
            report['outliers'] = outliers
        
        # Verificar duplicados
        duplicates = self.check_duplicates(df)
        if duplicates > 0:
            report['duplicates'] = {'count': duplicates}
        
        # Verificar balance de clases si se proporciona una columna objetivo
        if target_column and target_column in df.columns:
            class_balance = self.check_class_imbalance(df, target_column)
            report['class_balance'] = class_balance
        
        return report

class CardiovascularDataQuality(DataQualityChecker):
    def __init__(self):
        super().__init__()
        self.clinical_ranges = {
            'edad': (0, 100),
            'estatura': (100, 220),  # cm
            'peso': (30, 250),  # kg
            'imc': (15, 50),
            'presion_sistolica': (80, 200),
            'presion_diastolica': (60, 120),
        }
    
    def check_clinical_validity(self, df: pd.DataFrame) -> Dict[str, int]:
        clinical_issues = {}
        
        for column, (min_val, max_val) in self.clinical_ranges.items():
            if column in df.columns:
                invalid_count = df[(df[column] < min_val) | (df[column] > max_val)].shape[0]
                if invalid_count > 0:
                    clinical_issues[column] = invalid_count
        
        return clinical_issues
    
    def check_logical_consistency(self, df: pd.DataFrame) -> Dict[str, int]:
        consistency_issues = {}
        
        # Verificar que la presión sistólica sea mayor que la diastólica
        if 'presion_sistolica' in df.columns and 'presion_diastolica' in df.columns:
            invalid_bp = df[df['presion_sistolica'] <= df['presion_diastolica']].shape[0]
            if invalid_bp > 0:
                consistency_issues['presion_invalida'] = invalid_bp
        
        # Verificar IMC vs peso/altura
        if 'peso' in df.columns and 'estatura' in df.columns and 'imc' in df.columns:
            # Convertir estatura a metros si es necesario
            estatura_m = df['estatura'] / 100 if df['estatura'].mean() > 3 else df['estatura']
            imc_calculado = df['peso'] / (estatura_m ** 2)
            imc_diferencia = abs(df['imc'] - imc_calculado)
            invalid_imc = df[imc_diferencia > 1].shape[0]  # Permitir pequeña diferencia por redondeo
            if invalid_imc > 0:
                consistency_issues['imc_inconsistente'] = invalid_imc
        
        return consistency_issues
    
    def generate_report(self, df: pd.DataFrame, target_column: str = 'enfermedad_cardiovascular') -> Dict[str, Dict]:
        report = super().generate_report(df, target_column)
        
        # Añadir verificaciones clínicas específicas
        clinical_validity = self.check_clinical_validity(df)
        if clinical_validity:
            report['clinical_validity'] = clinical_validity
        
        logical_consistency = self.check_logical_consistency(df)
        if logical_consistency:
            report['logical_consistency'] = logical_consistency
        
        return report