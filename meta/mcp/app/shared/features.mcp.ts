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
        'set-feature',
        "Crear/actualizar una característica del proyecto. Gestiona el seguimiento de una característica",
        {
            params: z.object({
                id: z.string().describe("ID de la característica"),
                nombre: z.string().describe("Nombre descriptivo"),
                descripcion: z.string().describe("Descripción detallada (objetivo y necesidad)"),
                progreso: z.number().min(0).max(100).describe("Porcentaje de avance"),
                tareas: z.array(z.object({
                    id: z.string(),
                    desc: z.string(),
                    estado: z.enum(["pendiente", "en_progreso", "completada"]),
                    rutas: z.array(z.string()).optional()
                })).optional(),
                pruebas: z.object({
                    unitarias: z.string(),
                    integracion: z.string().optional()
                }).optional(),
                fecha_fin: z.string().optional().describe("Fecha de finalización (YYYY-MM-DD)").optional()
            }),
        },
        async ({ params }) => {
            try {
                const featurePath = path.join(paths.metaTrackingDir, "features", `${params.id}.yaml`)
                const isNew = !await fs.pathExists(featurePath)

                // Construir contenido YAML
                let content = `id: ${params.id}\n`
                content += `nombre: "${params.nombre}"\n`
                content += `descripcion: "${params.descripcion}"\n`
                content += `progreso: ${params.progreso}\n`
                content += `fecha_incio: ${new Date().toISOString()}\n`


                if (params.tareas && params.tareas.length > 0) {
                    content += `tareas:\n`
                    for (const tarea of params.tareas) {
                        content += `  - id: ${tarea.id}\n`
                        content += `    desc: "${tarea.desc}"\n`
                        content += `    estado: "${tarea.estado}"\n`
                        if (tarea.rutas && tarea.rutas.length > 0) {
                            content += `    rutas: [${tarea.rutas.map(t => `"${t}"`).join(', ')}]\n`
                        }
                    }
                }

                if (params.pruebas) {
                    content += `pruebas:\n`
                    content += `  unitarias: ${params.pruebas.unitarias}\n`
                    if (params.pruebas.integracion) {
                        content += `  integracion: ${params.pruebas.integracion}\n`
                    }
                }

                if (params.fecha_fin) {
                    content += `fecha_fin: ${params.fecha_fin}\n`
                }

                await fs.writeFile(featurePath, content)

                // Actualizar status.yaml para incluir esta feature si es nueva
                if (isNew) {
                    const statusPath = path.join(paths.metaTrackingDir, "status.yaml")
                    const status = await fs.readFile(statusPath, 'utf8')

                    // Añadir ID a funcionalidades_activas si no existe
                    if (!status.includes(params.id)) {
                        const newStatus = status.replace(
                            /funcionalidades_activas:(.*)/,
                            (match, p1) => {
                                const current = p1.trim() === '[]' ? [] : p1.trim().split(/,\s*/)
                                current.push(params.id)
                                return `funcionalidades_activas: [${current.join(', ')}]`
                            }
                        )
                        await fs.writeFile(statusPath, newStatus)
                    }
                }

                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: `tracking/features/${params.id}.yaml`,
                    tipo: isNew ? "add" : "mod",
                    desc: `${isNew ? "Creada" : "Actualizada"} feature: ${params.nombre}`
                })

                return {
                    content: [
                        {
                            type: "text",
                            text: `Feature ${isNew ? "creada" : "actualizada"} exitosamente: ${params.id}`
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