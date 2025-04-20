// mcp\app\shared\features.mcp.tse
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logChange } from "../utils/logger.js";
import { debug } from "../utils/fileLogger.js";

import path from "path";
import paths from "../config/paths.js";
import fs from "fs-extra";

/**
 * Registra la herramienta de escaneo de proyecto en el servidor MCP
 */
export function registerFeaturesMcp(server: McpServer) {
    // Herramienta para crear/actualizar feature
    server.tool(
        'gestionar-feature',
        "Crea o actualiza una característica del proyecto",
        {
            description: z.string().describe("Gestiona el seguimiento de una característica"),
            parameters: z.object({
                id: z.string().describe("ID de la característica"),
                nombre: z.string().describe("Nombre descriptivo"),
                descripcion: z.string().describe("Descripción detallada"),
                progreso: z.number().min(0).max(100).describe("Porcentaje de avance"),
                tareas: z.array(z.object({
                    id: z.string(),
                    desc: z.string(),
                    estado: z.enum(["pendiente", "en_progreso", "completado", "bloqueado"]),
                    rutas: z.array(z.string()).optional()
                })).optional(),
                pruebas: z.object({
                    unitarias: z.string(),
                    integracion: z.string().optional()
                }).optional()
            }),
        },
        async ({ parameters }) => {
            try {
                const featurePath = path.join(paths.trackingDir, "features", `${parameters.id}.yaml`)
                const isNew = !await fs.pathExists(featurePath)

                // Construir contenido YAML
                let content = `id: ${parameters.id}\n`
                content += `nombre: "${parameters.nombre}"\n`
                content += `descripcion: "${parameters.descripcion}"\n`
                content += `progreso: ${parameters.progreso}\n`

                if (parameters.tareas && parameters.tareas.length > 0) {
                    content += `tareas:\n`
                    for (const tarea of parameters.tareas) {
                        content += `  - id: ${tarea.id}\n`
                        content += `    desc: "${tarea.desc}"\n`
                        content += `    estado: "${tarea.estado}"\n`
                        if (tarea.rutas && tarea.rutas.length > 0) {
                            content += `    rutas: [${tarea.rutas.map(t => `"${t}"`).join(', ')}]\n`
                        }
                    }
                }

                if (parameters.pruebas) {
                    content += `pruebas:\n`
                    content += `  unitarias: ${parameters.pruebas.unitarias}\n`
                    if (parameters.pruebas.integracion) {
                        content += `  integracion: ${parameters.pruebas.integracion}\n`
                    }
                }

                await fs.writeFile(featurePath, content)

                // Actualizar status.yaml para incluir esta feature si es nueva
                if (isNew) {
                    const statusPath = path.join(paths.trackingDir, "status.yaml")
                    const status = await fs.readFile(statusPath, 'utf8')

                    // Añadir ID a funcionalidades_activas si no existe
                    if (!status.includes(parameters.id)) {
                        const newStatus = status.replace(
                            /funcionalidades_activas:(.*)/,
                            (match, p1) => {
                                const current = p1.trim() === '[]' ? [] : p1.trim().split(/,\s*/)
                                current.push(parameters.id)
                                return `funcionalidades_activas: [${current.join(', ')}]`
                            }
                        )
                        await fs.writeFile(statusPath, newStatus)
                    }
                }

                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: `tracking/features/${parameters.id}.yaml`,
                    tipo: isNew ? "add" : "mod",
                    desc: `${isNew ? "Creada" : "Actualizada"} feature: ${parameters.nombre}`
                })

                return {
                    content: [
                        {
                            type: "text",
                            text: `Feature ${isNew ? "creada" : "actualizada"} exitosamente: ${parameters.id}`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en gestionar-feature: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error al gestionar feature: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

}