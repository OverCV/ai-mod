# Rutas para autenticación con Spring

from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Any, Dict, Optional
import httpx
import logging

from api.core.classes.configuracion import settings

router = APIRouter(
    prefix="/auth",
    tags=["autenticacion"],
    responses={404: {"description": "No encontrado"}},
)

logger = logging.getLogger("api")

@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    credenciales: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    try:
        spring_url = f"{settings.spring_api_url}/acceso"
        async with httpx.AsyncClient() as client:
            response = await client.post(spring_url, json=credenciales)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Error en autenticación: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error en autenticación: {response.text}"
                )
    except httpx.RequestError as e:
        logger.error(f"Error de comunicación con el servidor Spring: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error de comunicación con el servidor: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error inesperado en login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado: {str(e)}"
        )

@router.get("/validate", status_code=status.HTTP_200_OK)
async def validate_token(
    token: str
) -> Dict[str, Any]:
    try:
        spring_url = f"{settings.spring_api_url}/validar-token"
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(spring_url, headers=headers)
            
            if response.status_code == 200:
                return {"valid": True, "user": response.json()}
            else:
                return {"valid": False, "error": response.text}
    except Exception as e:
        logger.error(f"Error validando token: {str(e)}")
        return {"valid": False, "error": str(e)}