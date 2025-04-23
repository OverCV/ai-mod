// mcp\app\shared\files.mcp.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { scanProject } from "../tools/scanner.js"
import { logChange } from "../utils/logger.js"
import { debug } from "../utils/fileLogger.js"
import { generateDirectoryTree as scanDirectoryTree, listDirectory, modifyFile, readFile, writeFile } from "../tools/filesystem.js"

import path from "path"
import paths from "../config/paths.js"
import fs from "fs-extra"

/**
 * Registra la herramienta de escaneo de proyecto en el servidor MCP
 */
export function registerFileMcp(server: McpServer) {
    // Herramienta para leer archivos
    // También necesitamos actualizar leer-archivo para manejar el mismo prefijo

    server.tool(
        'archivo-leer',
        "Lee el contenido de un archivo. Lee un archivo del proyecto",
        {
            params: z.object({
                ruta: z.string().describe("Ruta relativa al archivo desde la raíz del proyecto")
            }),
        },
        async ({ params }) => {
            try {
                // Buscar primero con el prefijo code/ si no lo tiene
                let ruta = params.ruta
                let filePath = path.join(paths.PROJECT_BASE, ruta)

                const content = await readFile(filePath)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Contenido de ${ruta}:\n\n${content}`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en leer-archivo: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error al leer archivo: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Herramienta para escribir archivos
    server.tool(
        'archivo-crear',
        "Crea un archivo condicionado por los tokens de respuesta. Escribe contenido en un archivo",
        {
            params: z.object({
                // en_code: z.boolean().describe("La ruta actual es en `code/`? sino será `meta/mpc/` (desde la raíz)(usado para el escaneo)"),
                ruta: z.string().describe("Ruta relativa del proyecto raíz al archivo"),
                desc: z.string().describe("Breve descripción del cambio alterar luego la feature o tarea asociada"),
                cont: z.string().describe("Contenido a escribir en el archivo"),
            }),
        },
        async ({ params: params }) => {
            try {

                // todo: Primero debemos escanear el proyecto para asegurarnos de que la ruta es válida (el archivo no exista en otro lado)

                // todo: Hacer bien esta parte indicando al modelo que pues si se crea un archivo se valida que no esté, si está pues debería volver y retornar que haga un modificar. Por otro lado si no está y de verdad no hay un objetivo TRAS HACER el escaneo del árbol , entonces sí se crea, si no está se retorna diciendo que se debe crear dicha subtarea en la feature, pero pues si ya estaba es crearlo y retorna que actualice el arbol detallado porque en dihca ruta ya está y así no se va a repetir el coso, así como en el ascii, algo así es la idea.

                // Ahora usar la ruta corregida (base + prefijo + ruta)
                // const dirPath = params.en_code ? paths.codeRoot : paths.metaMpcRoot
                const filePath = path.join(paths.PROJECT_BASE, params.ruta)
                // Si el prefijo es mcp, usar la ruta de mcp


                await writeFile(filePath, params.cont)
                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: filePath,
                    tipo: "add",
                    desc: params.desc
                })

                // todo: actualizar las tareas de la feature porque se hizo esta subtarea, así mismo con editar
                // await updateFeatureTask(params.intencion, params.ruta, params.descripcion)

                // escribir el archivo destinado por ruta

                await fs.ensureDir(path.dirname(filePath))
                await fs.writeFile(filePath, params.cont)



                return {
                    content: [
                        {
                            type: "text",
                            text: `Archivo creado exitosamente: ${params.ruta}`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en escribir-archivo: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error al escribir archivo: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Herramienta para modificar parte de un archivo
    server.tool(
        'archivo-editar',
        "Modifica una parte específica de un archivo. Reemplaza texto dentro de un archivo",
        {
            params: z.object({
                ruta: z.string().describe("Ruta relativa al archivo desde la raíz del proyecto"),
                desc: z.string().describe("Breve descripción del cambio para el registro"),
                busca: z.string().describe("Texto a buscar"),
                cambio: z.string().describe("Texto de reemplazo"),
            }),
        },
        async ({ params }) => {
            try {
                const filePath = path.join(paths.PROJECT_BASE, params.ruta)

                await modifyFile(
                    filePath,
                    params.busca,
                    params.cambio
                )

                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: params.ruta,
                    tipo: "mod",
                    desc: params.desc
                })

                return {
                    content: [
                        {
                            type: "text",
                            text: `Archivo modificado exitosamente: ${params.ruta}`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en modificar-archivo: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error al modificar archivo: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Herramienta para mover archivos o directorios
    server.tool(
        'mover',
        "Mueve un archivo o directorio a otra ubicación.",
        {
            params: z.object({
                origen: z.string().describe("Ruta relativa al archivo o directorio a mover"),
                destino: z.string().describe("Ruta relativa al nuevo destino"),
                desc: z.string().describe("Breve descripción del cambio para el registro")
            }),
        },
        async ({ params }) => {
            try {
                const rutaOrigen = path.join(paths.PROJECT_BASE, params.origen)

                // Asegurar que el destino comience con code/ si no es una ruta especial
                let rutaDestino = params.destino
                // if (!rutaDestino.startsWith('code/') &&
                //     !rutaDestino.startsWith('mcp/') &&
                //     !rutaDestino.startsWith('tests/')) {
                //     rutaDestino = `code/${rutaDestino}`
                // }

                const rutaDestinoCompleta = path.join(paths.PROJECT_BASE, rutaDestino)

                // Verificar que el origen existe
                if (!await fs.pathExists(rutaOrigen)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: No se encontró el archivo o directorio de origen: ${params.origen}`
                            }
                        ]
                    }
                }

                // Crear directorio de destino si no existe
                await fs.ensureDir(path.dirname(rutaDestinoCompleta))

                // Mover el archivo o directorio
                await fs.move(rutaOrigen, rutaDestinoCompleta, { overwrite: true })

                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: params.origen,
                    tipo: "mod",
                    desc: `Movido de ${params.origen} a ${rutaDestino}: ${params.desc}`
                })

                // todo: Actualizar RAG de directorios
                // todo: No, sólo se actualiza cuando se va a crear algo para no repetir?
                // const { detailed } = await scanProject(paths.PROJECT_BASE)
                // await fs.writeFile(
                //     path.join(paths.metaContextDir, "project_tree.json"),
                //     JSON.stringify(detailed, null, 2)
                // )

                return {
                    content: [
                        {
                            type: "text",
                            text: `Archivo o directorio movido exitosamente de ${params.origen} a ${rutaDestino}`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en mover-archivo: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error al mover archivo: ${error.message}`
                        }
                    ]
                }
            }
        }
    )
}