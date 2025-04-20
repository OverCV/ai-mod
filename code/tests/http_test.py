import sys
import os
from pathlib import Path

# Añadir ruta al path para poder encontrar el módulo
sys.path.append(str(Path(__file__).parent))
from mcp.tools.http_client import make_request

result = make_request('GET', 'http://localhost:8000')
print(f"Status code: {result.get('status_code', 'N/A')}")
if 'error' in result:
    print(f"Error: {result.get('error')}")
else:
    print(f"Response data: {result.get('data', 'No data')}")

print("\nProbando endpoint de info del modelo...")
result = make_request('GET', 'http://localhost:8000/riesgo-cardiovascular/info')
print(f"Status code: {result.get('status_code', 'N/A')}")
if 'error' in result:
    print(f"Error: {result.get('error')}")
else:
    print(f"Response data: {result.get('data', 'No data')}")g