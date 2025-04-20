# Orquestador principal para entrenamiento y evaluación de modelos

from config.settings import ModelConfig
from models.riesgo_cardiovascular.pipeline import RiesgoCardiovascularPipeline


def train_model(model_type: str):
    """Entrena un modelo según el tipo especificado"""
    if model_type == "riesgo_cardiovascular":
        pipeline = RiesgoCardiovascularPipeline()
        pipeline.train_and_evaluate()
    # Añadir más modelos según se implementen
    else:
        raise ValueError(f"Tipo de modelo no soportado: {model_type}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Entrenamiento de modelos predictivos médicos"
    )
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        choices=[
            "riesgo_cardiovascular",
            "hospitalizaciones",
            "asistencias",
            "flujo_atencion",
        ],
        help="Tipo de modelo a entrenar",
    )
    args = parser.parse_args()

    train_model(args.model)
