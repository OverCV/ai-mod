import * as fs from 'fs-extra';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Corrige la lectura del archivo .env probando diferentes rutas
 */
export function setupEnvironment(): void {
    const possiblePaths = [
        path.resolve(__dirname, '../../.env'),       // Dos niveles arriba (mcp/.env)
        path.resolve(__dirname, '../.env'),          // Un nivel arriba (mcp/orchestrator/.env)
        path.resolve(__dirname, './.env'),           // Directorio actual
        path.resolve(process.cwd(), '.env')          // Directorio de trabajo actual
    ];

    let envLoaded = false;

    // Intentar cargar desde alguna de las rutas posibles
    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            console.log(`Cargando variables de entorno desde: ${envPath}`);
            dotenv.config({ path: envPath });
            envLoaded = true;

            // Combinar con el archivo .env de MCP si es diferente
            const mcpEnvPath = path.resolve(__dirname, '../../.env');
            if (envPath !== mcpEnvPath && fs.existsSync(mcpEnvPath)) {
                console.log(`Combinando con variables de MCP desde: ${mcpEnvPath}`);
                const mcpEnv = dotenv.parse(fs.readFileSync(mcpEnvPath));

                // Agregar solo las variables que no existen ya
                Object.keys(mcpEnv).forEach(key => {
                    if (!process.env[key]) {
                        process.env[key] = mcpEnv[key];
                    }
                });
            }

            break;
        }
    }

    if (!envLoaded) {
        console.warn("No se encontró archivo .env. Usando solo variables de entorno del sistema.");
    }

    // Copiar variables específicas del MCP a las que espera el orquestador
    if (process.env.GITHUB_APP_TOKEN && !process.env.GITHUB_TOKEN) {
        process.env.GITHUB_TOKEN = process.env.GITHUB_APP_TOKEN;
    }

    // Verificar variables críticas y mostrar información
    console.log("\n--- Variables de entorno cargadas ---");
    console.log(`CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Configurado' : '❌ No configurado'}`);
    console.log("---------------------------------------\n");
}