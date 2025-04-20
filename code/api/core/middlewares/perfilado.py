# Middleware de perfilado para medición de rendimiento

from fastapi import Request
from typing import Callable
import time
import logging

logger = logging.getLogger("api")

class PerfiladoMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # Este middleware ya no es compatible con la nueva versión de FastAPI
        # Solo pasamos la solicitud a la siguiente capa
        await self.app(scope, receive, send)