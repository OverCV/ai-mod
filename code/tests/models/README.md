# Modelos para API

Esta carpeta contiene los modelos entrenados que son utilizados por la API.

## Estructura

- `r_cardio/` - Modelos para predicción de riesgo cardiovascular

## Modelos disponibles

### Riesgo Cardiovascular

- `mejor_modelo.pkl` - Mejor modelo seleccionado por evaluación comparativa
- `scaler.pkl` - Escalador para las características
- `features.txt` - Lista de características utilizadas
- `feature_importance.csv` - Importancia de las características

## Actualización de modelos

Los modelos se actualizan automáticamente desde la carpeta `code/models/` cuando se ejecuta la API. Sin embargo, para mayor eficiencia, se recomienda ejecutar explícitamente el script de actualización:

```bash
python api/utils/update_models.py
```