import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logChange } from "../utils/logger.js";
import { debug } from "../utils/fileLogger.js";

import path from "path";
import paths from "../config/paths.js";
import fs from "fs-extra";

/**
 * Registra herramientas relacionadas con el sistema y el MetaMCP
 */
export function registerSystemMcp(server: McpServer) {
    // Herramienta para recargar el MetaMCP
    server.tool(
        'recargar-mcp',
        "Recarga el servidor MetaMCP para aplicar cambios",
        {
            description: z.string().describe("Reinicia el servidor MetaMCP"),
            parameters: z.object({}),
        },
        async () => {
            try {
                await logChange({
                    fecha: new Date().toISOString(),
                    tipo: "system",
                    desc: "Solicitada recarga del servidor MetaMCP"
                });

                // Informar que se va a recargar el MetaMCP
                setTimeout(() => {
                    process.exit(0); // El servicio de Claude debería reiniciar el MetaMCP automáticamente
                }, 1000);

                return {
                    content: [
                        {
                            type: "text",
                            text: "El servidor MetaMCP se recargará en unos segundos. Si la interfaz no responde, por favor reinicia manualmente la conexión."
                        }
                    ]
                };
            } catch (error: any) {
                debug(`Error recargando MetaMCP: ${error.message}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error recargando MetaMCP: ${error.message}`
                        }
                    ]
                };
            }
        }
    );

    // Herramienta para ejecutar comandos del sistema
    server.tool(
        'ejecutar-comando',
        "Ejecuta un comando en la terminal",
        {
            description: z.string().describe("Ejecuta un comando del sistema operativo"),
            parameters: z.object({
                comando: z.string().describe("Comando a ejecutar"),
                directorio: z.string().optional().describe("Directorio donde ejecutar (por defecto: code/)")
            }),
        },
        async ({ parameters }) => {
            try {
                const { exec } = await import('child_process');
                const util = await import('util');
                const execAsync = util.promisify(exec);

                // Determinar directorio de trabajo
                let workDir = parameters.directorio
                    ? path.join(paths.PROJECT_BASE, parameters.directorio)
                    : paths.codeRoot;

                // Asegurar que existe el directorio
                if (!await fs.pathExists(workDir)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: No existe el directorio ${parameters.directorio || 'code/'}`
                            }
                        ]
                    };
                }

                debug(`Ejecutando comando: ${parameters.comando} en ${workDir}`);

                // Ejecutar el comando
                const { stdout, stderr } = await execAsync(parameters.comando, {
                    cwd: workDir,
                    maxBuffer: 5 * 1024 * 1024 // 5MB buffer para comandos con mucha salida
                });

                await logChange({
                    fecha: new Date().toISOString(),
                    tipo: "system",
                    desc: `Ejecutado comando: ${parameters.comando}`
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Comando ejecutado: ${parameters.comando}\n\nSalida:\n${stdout}\n\n${stderr ? `Errores:\n${stderr}` : ''}`
                        }
                    ]
                };
            } catch (error: any) {
                debug(`Error ejecutando comando: ${error.message}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error ejecutando comando: ${error.message}`
                        }
                    ]
                };
            }
        }
    );
}