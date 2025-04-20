# Sistema de Predicción de Riesgo Cardiovascular

Sistema para predicción de riesgo cardiovascular basado en factores clínicos, con entrenamiento de modelos y API RESTful.

## Estructura del proyecto

```
code/
├── api/                            # API RESTful con FastAPI
│   ├── .env/                       # Variables de entorno
│   ├── core/                       # Núcleo de la API
│   │   ├── classes/                # Clases y esquemas
│   │   ├── middlewares/            # Middlewares
│   │   ├── routes/                 # Rutas de la API
│   │   └── services/               # Servicios de negocio
│   ├── main.py                     # Punto de entrada
│   └── run.py                      # Script para iniciar la API
├── models/                         # Modelos entrenados
│   └── r_cardio/                   # Modelos de riesgo cardiovascular
├── src/                            # Módulo de ciencia de datos
│   ├── config/                     # Configuraciones
│   ├── data/                       # Procesamiento de datos
│   │   ├── datasets/               # Conjuntos de datos
│   │   ├── etl/                    # Extractores, transformadores y cargadores
│   │   ├── preprocessing/          # Preprocesamiento
│   │   └── validation/             # Validación de datos
│   ├── models/                     # Modelos de ML
│   │   ├── base.py                 # Clase base para modelos
│   │   ├── riesgo_cardiovascular/  # Modelos CV
│   └── utils/                      # Utilidades
└── tests/                          # Pruebas unitarias
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