# Sistema de Predicción de Riesgo Cardiovascular

Sistema para predicción de riesgo cardiovascular basado en factores clínicos, con entrenamiento de modelos y API RESTful.

## Estructura del proyecto

```
├── README.md
├── api/
│   ├── .env/
│   │   └── api.env
│   ├── README.md
│   ├── core/
│   │   ├── classes/
│   │   │   ├── configuracion.py
│   │   │   ├── schemas/
│   │   │   │   └── riesgo_cv.py
│   │   │   └── tables.py
│   │   ├── data/
│   │   │   ├── db_connector.py
│   │   │   └── motors.py
│   │   ├── middlewares/
│   │   │   ├── auth.py
│   │   │   ├── excepcion.py
│   │   │   └── perfilado.py
│   │   ├── repository/
│   │   │   └── predicciones.py
│   │   ├── routes/
│   │   │   ├── autenticacion.py
│   │   │   └── riesgo_cv.py
│   │   └── services/
│   │       └── riesgo_cv.py
│   ├── main.py
│   ├── models/
│   │   ├── README.md
│   │   └── r_cardio/
│   │       ├── cardio_features.txt
│   │       ├── cardio_model.pkl
│   │       ├── comparativa_modelos.csv
│   │       ├── feature_importance.csv
│   │       ├── feature_importance.png
│   │       ├── features.txt
│   │       ├── matriz_confusion.png
│   │       ├── mejor_modelo.pkl
│   │       ├── rf_cardio_features.txt
│   │       ├── rf_cardio_scaler.pkl
│   │       ├── roc_curves.png
│   │       └── scaler.pkl
│   ├── requirements.txt
│   ├── run.py
│   ├── test_api.py
│   └── utils/
│       ├── __init__.py
│       └── update_models.py
├── http_test.py
├── mcp/
│   ├── .env
│   ├── app/
│   │   ├── main.ts
│   │   ├── shared/
│   │   │   ├── database.mcp.ts
│   │   │   └── index.ts
│   │   └── tools/
│   │       └── database.ts
│   ├── package-lock.json
│   └── temp/
│       ├── database.mcp.ts
│       └── testfile.txt
├── models/
│   └── r_cardio/
│       ├── cardio_features.txt
│       ├── cardio_model.pkl
│       ├── comparativa_modelos.csv
│       ├── feature_importance.csv
│       ├── feature_importance.png
│       ├── features.txt
│       ├── matriz_confusion.png
│       ├── mejor_modelo.pkl
│       ├── rf_cardio_features.txt
│       ├── rf_cardio_model.pkl
│       ├── rf_cardio_scaler.pkl
│       ├── roc_curves.png
│       └── scaler.pkl
├── requirements.txt
├── src/
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── logging_config.py
│   │   └── settings.py
│   ├── data/
│   │   ├── __init__.py
│   │   ├── datasets/
│   │   │   ├── __init__.py
│   │   │   ├── rehospitalizacion/
│   │   │   └── riesgo_cardiovascular/
│   │   │       ├── enfermedades_cardiovasculares.csv
│   │   │       ├── heart+disease/
│   │   │       │   ├── Index
│   │   │       │   ├── WARNING
│   │   │       │   ├── ask-detrano
│   │   │       │   ├── bak
│   │   │       │   ├── cleve.mod
│   │   │       │   ├── cleveland.data
│   │   │       │   ├── costs/
│   │   │       │   │   ├── Index
│   │   │       │   │   ├── heart-disease.README
│   │   │       │   │   ├── heart-disease.cost
│   │   │       │   │   ├── heart-disease.delay
│   │   │       │   │   ├── heart-disease.expense
│   │   │       │   │   └── heart-disease.group
│   │   │       │   ├── heart-disease.names
│   │   │       │   ├── hungarian.data
│   │   │       │   ├── link.txt
│   │   │       │   ├── long-beach-va.data
│   │   │       │   ├── new.data
│   │   │       │   ├── processed.cleveland.data
│   │   │       │   ├── processed.hungarian.data
│   │   │       │   ├── processed.switzerland.data
│   │   │       │   ├── processed.va.data
│   │   │       │   ├── reprocessed.hungarian.data
│   │   │       │   └── switzerland.data
│   │   │       ├── hospitalizacion_dataset.csv
│   │   │       └── log-reg/
│   │   │           ├── framingham.csv
│   │   │           └── link.txt
│   │   ├── etl/
│   │   │   ├── __init__.py
│   │   │   ├── extractors.py
│   │   │   ├── loaders.py
│   │   │   └── transformers.py
│   │   ├── preprocessing/
│   │   │   ├── __init__.py
│   │   │   ├── encoders.py
│   │   │   └── feature_engineering.py
│   │   └── validation/
│   │       ├── __init__.py
│   │       ├── data_quality.py
│   │       └── schema_validator.py
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── asistencias/
│   │   ├── base.py
│   │   ├── flujo_atencion/
│   │   ├── hospitalizaciones/
│   │   └── riesgo_cardiovascular/
│   │       ├── __init__.py
│   │       ├── comparador.py
│   │       ├── evaluator.py
│   │       ├── feature_selector.py
│   │       ├── pipeline.py
│   │       └── trainer.py
│   └── utils/
│       ├── __init__.py
│       ├── metrics.py
│       ├── model_registry.py
│       └── visualizations.py
├── test_cv_api.py
└── tests/
    ├── __init__.py
    ├── cv_training_test.py
    ├── mini_test.py
    ├── test_api.py
    ├── test_api_riesgo_cv.py
    └── test_riesgo_cv.py

```

## Configuración

1. Crear entorno virtual: `python -m venv .venv`
2. Activar entorno: `.venv\Scripts\activate` (Windows) o `source .venv/bin/activate` (Linux/Mac)
3. Instalar dependencias:
   - Para el módulo ML: `pip install -r requirements.txt`
   - Para la API: `pip install -r api/requirements.txt`

## Uso

### Entrenamiento de modelos

```bash
python src/models/riesgo_cardiovascular/comparador.py
```

### Ejecución de la API

```bash
python api/run.py
```

## Endpoints API

- `GET /` - Estado del servicio
- `GET /riesgo-cardiovascular/info` - Información del modelo
- `POST /riesgo-cardiovascular/predecir` - Predecir riesgo cardiovascular
- `GET /riesgo-cardiovascular/predicciones/{paciente_id}` - Historial de predicciones
- `GET /riesgo-cardiovascular/estado-salud/{paciente_id}` - Estado general de salud