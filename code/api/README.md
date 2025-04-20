# API de Predicción Cardiovascular

API RESTful basada en FastAPI para realizar predicciones de riesgo cardiovascular.

## Estructura

```
api/
├── .env/                  # Variables de entorno
│   └── api.env            # Configuración de API
├── core/                  # Componentes principales
│   ├── classes/            # Esquemas y definiciones
│   ├── data/               # Conexión a datos
│   ├── middlewares/        # Middlewares
│   ├── repository/         # Acceso a DB
│   ├── routes/             # Rutas API
│   └── services/           # Servicios
├── models/                # Modelos entrenados
│   └── r_cardio/           # Modelos cardiovasculares
├── utils/                 # Utilidades
│   └── update_models.py     # Actualización de modelos
├── main.py                # Punto de entrada
├── run.py                 # Script de inicio
├── requirements.txt       # Dependencias
└── test_api.py            # Script de pruebas
```

## Instalación

```bash
pip install -r requirements.txt
```

## Uso

### Ejecutar API

```bash
python run.py
```

### Probar API

```bash
python test_api.py
```

## Endpoints

- `GET /` - Estado del servicio
- `GET /riesgo-cardiovascular/info` - Información del modelo actual
- `POST /riesgo-cardiovascular/predecir` - Predecir riesgo cardiovascular
- `GET /riesgo-cardiovascular/predicciones/{paciente_id}` - Historial de predicciones
- `GET /riesgo-cardiovascular/estado-salud/{paciente_id}` - Estado general de salud
- `POST /auth/login` - Autenticación con sistema principal

## Predicción

Ejemplo de petición:

```json
{
  "edad": 50,
  "genero": 1,
  "estatura": 170,
  "peso": 80,
  "presion_sistolica": 140,
  "presion_diastolica": 90,
  "colesterol": 2,
  "glucosa": 1,
  "tabaco": 1,
  "alcohol": 0,
  "act_fisica": 0
}
```

Ejemplo de respuesta:

```json
{
  "probabilidad": 0.75,
  "riesgo": true,
  "nivel_riesgo": "Alto",
  "factores_principales": [
    {"imc": 0.31},
    {"presion_sistolica": 0.25},
    {"edad": 0.18}
  ],
  "recomendaciones": [
    "Consulte a un médico lo antes posible para una evaluación cardiovascular completa.",
    "Considere monitorear su presión arterial regularmente y reducir el consumo de sal.",
    "Dejar de fumar puede reducir significativamente su riesgo cardiovascular."
  ]
}
```

## Integración

Esta API está diseñada para integrarse con el sistema principal mediante:

1. Autenticación con Spring Backend
2. Almacenamiento de predicciones en PostgreSQL
3. Exposición de endpoints para frontend React