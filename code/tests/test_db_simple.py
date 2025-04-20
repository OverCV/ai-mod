from pathlib import Path
import sys
current_dir = Path(__file__).parent
sys.path.append(str(current_dir.parent))

from api.core.data.db_connector import get_db
from sqlalchemy import text

def test_db_connection():
    print("Probando conexión simple a la base de datos...")
    db = next(get_db())
    
    try:
        # Consulta simple
        result = db.execute(text("SELECT 1 as test")).fetchone()
        print(f"Resultado simple: {result.test}")
        
        # Verificar una tabla existente
        result = db.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pacientes'")).fetchone()
        print(f"La tabla pacientes existe: {result[0] > 0}")
        
        # Verificar el esquema
        result = db.execute(text("SELECT current_schema()")).fetchone()
        print(f"Esquema actual: {result[0]}")
        
        # Listar todas las tablas en el esquema actual
        tables = db.execute(text(
            """SELECT table_name 
               FROM information_schema.tables 
               WHERE table_schema = current_schema()
               ORDER BY table_name"""
        )).fetchall()
        
        print("\nTablas disponibles:")
        for table in tables:
            print(f"- {table[0]}")
            
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    resultado = test_db_connection()
    print(f"\nPrueba {'exitosa' if resultado else 'fallida'}!")
