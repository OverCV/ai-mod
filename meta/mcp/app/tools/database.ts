import { debug } from "../utils/fileLogger.js";
import path from "path";
import fs from "fs-extra";
import paths from "../config/paths.js";
import dotenv from "dotenv";


// Cargar variables de entorno
dotenv.config({ path: path.join(paths.metaMpcRoot, '.env') });

// Necesitamos importar pg (asegúrate de tenerlo instalado: npm install pg @types/pg)
import pg from "pg";

// Pool de conexiones a la base de datos
let pool: pg.Pool | null = null;

/**
 * Obtiene el pool de conexiones, creándolo si no existe
 */
export const getPool = () => {
  if (!pool) {
    // Obtener URL de conexión de variables de entorno o archivo de configuración
    const dbConfigPath = path.join(paths.metaMpcRoot, "database.json");
    let dbUrl = process.env.DATABASE_URL;

    if (fs.existsSync(dbConfigPath)) {
      try {
        const config = fs.readJSONSync(dbConfigPath);
        dbUrl = dbUrl || config.urlEnvName; // Almacenamos el nombre de la variable de entorno, no la URL
      } catch (error) {
        debug(`Error leyendo configuración de base de datos: ${error}`);
      }
    }

    if (!dbUrl) {
      debug('URL de conexión a base de datos no encontrada. Configure DATABASE_URL en .env');
      throw new Error('URL de conexión a base de datos no configurada');
    }

    // Solo registrar que se está conectando, sin mostrar las credenciales
    debug(`Conectando a la base de datos PostgreSQL...`);

    pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '5'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
    });

    // Monitorear eventos del pool
    pool.on('error', (err) => {
      debug(`Error inesperado en el pool de conexiones: ${err.message}`);
    });
  }
  return pool;
};

/**
 * Ejecuta una consulta SQL y devuelve los resultados
 */
export async function executeQuery(query: string, params: any[] = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(query, params);
    return {
      data: result.rows,
      rowCount: result.rowCount,
      fields: result.fields
    };
  } catch (err) {
    debug(`Error ejecutando query: ${err}`);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Configura la conexión a la base de datos desde un archivo
 */
export async function configureDatabase(configPath: string, config: any) {
  try {
    const envName = config.urlEnvName || 'DATABASE_URL';
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJSON(configPath, { urlEnvName: envName }, { spaces: 2 });
    debug(`Configurado para usar la variable de entorno: ${envName}`);

    // Reiniciar el pool para usar la nueva configuración
    if (pool) {
      await pool.end();
      pool = null;
    }
    return true;
  } catch (error) {
    debug(`Error configurando base de datos: ${error}`);
    return false;
  }
}
