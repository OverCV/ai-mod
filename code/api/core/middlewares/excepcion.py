# Middleware para manejo de excepciones

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Callable, Dict, Any
import traceback
import logging

logger = logging.getLogger("api")

class ExcepcionMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        try:
            await self.app(scope, receive, send)
        except RequestValidationError as e:
            response = self._handle_validation_error(e)
            await response(scope, receive, send)
        except Exception as e:
            response = self._handle_generic_error(e)
            await response(scope, receive, send)
    
    def _handle_validation_error(self, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for error in exc.errors():
            error_msg = {
                "loc": error.get("loc", []),
                "msg": error.get("msg", ""),
                "type": error.get("type", "")
            }
            errors.append(error_msg)
        
        logger.warning(f"Error de validación: {errors}")
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Error de validación de datos",
                "errors": errors
            }
        )
    
    def _handle_generic_error(self, exc: Exception) -> JSONResponse:
        error_detail = str(exc)
        stack_trace = traceback.format_exc()
        
        logger.error(f"Excepción no controlada: {error_detail}\n{stack_trace}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "Error interno del servidor",
                "detail": error_detail
            }
        )
