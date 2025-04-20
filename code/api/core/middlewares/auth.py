# Middleware de autenticación

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import jwt
from typing import Callable, List, Optional
import httpx
from api.core.classes.configuracion import settings
import logging

logger = logging.getLogger("api")

class AuthMiddleware:
    def __init__(self, app, public_paths: List[str] = None):
        self.app = app
        self.public_paths = public_paths or [
            "/",
            "/auth/login",
            "/auth/validate",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]
    
    async def __call__(self, request: Request, call_next: Callable):
        # Verificar si la ruta es pública
        path = request.url.path
        if self._is_public_path(path):
            return await call_next(request)
        
        # Verificar token de autorización
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Se requiere autenticación mediante token"}
            )
        
        token = authorization.split(" ")[1]
        is_valid = await self._validate_token(token)
        
        if not is_valid:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token inválido o expirado"}
            )
        
        # Continuar con la solicitud
        return await call_next(request)
    
    def _is_public_path(self, path: str) -> bool:
        for public_path in self.public_paths:
            if path == public_path or path.startswith(public_path + "/"):
                return True
        return False
    
    async def _validate_token(self, token: str) -> bool:
        try:
            spring_url = f"{settings.spring_api_url}/validar-token"
            headers = {"Authorization": f"Bearer {token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(spring_url, headers=headers)
                return response.status_code == 200
                
        except Exception as e:
            logger.error(f"Error validando token: {str(e)}")
            return False