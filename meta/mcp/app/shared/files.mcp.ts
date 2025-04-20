    // mcp\app\shared\files.mcp.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { scanProject } from "../tools/scanner.js"
import { logChange } from "../utils/logger.js"
import { debug } from "../utils/fileLogger.js"
import { generateDirectoryTree, listDirectory, modifyFile, readFile, writeFile } from "../tools/filesystem.js"

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
        'leer-archivo',
        "Lee el contenido de un archivo",
        {
            description: z.string().describe("Lee un archivo del proyecto"),
            parameters: z.object({
                ruta: z.string().describe("Ruta relativa al archivo desde la raíz del proyecto")
            }),
        },
        async ({ parameters }) => {
            try {
                // Buscar primero con el prefijo code/ si no lo tiene
                let ruta = parameters.ruta
                let filePath = path.join(paths.PROJECT_BASE, ruta)

                // Si no existe y no comienza con code/, intentar con el prefijo
                if (!await fs.pathExists(filePath) && !ruta.startsWith('code/')) {
                    ruta = `code/${ruta}`
                    filePath = path.join(paths.PROJECT_BASE, ruta)
                }

                // Si todavía no existe, probar en mpc/ (para configuraciones)
                if (!await fs.pathExists(filePath) && !ruta.startsWith('mcp/')) {
                    // Intentar dentro de mcp
                    const mpcPath = path.join(paths.metaMpcRoot, parameters.ruta)
                    if (await fs.pathExists(mpcPath)) {
                        filePath = mpcPath
                    }
                }

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
        'escribir-archivo',
        "Crea o modifica un archivo",
        {
            description: z.string().describe("Escribe contenido en un archivo"),
            parameters: z.object({
                ruta: z.string().describe("Ruta relativa al archivo desde la raíz del proyecto"),
                contenido: z.string().describe("Contenido a escribir en el archivo"),
                descripcion: z.string().describe("Descripción del cambio para el registro")
            }),
        },
        async ({ parameters }) => {
            try {
                // Asegurar que la ruta comience con code/
                let ruta = parameters.ruta
                if (!ruta.startsWith('code/')) {
                    ruta = `code/${ruta}`
                }

                // Ahora usar la ruta corregida
                const filePath = path.join(paths.PROJECT_BASE, ruta)
                const isNew = !await fs.pathExists(filePath)

                await writeFile(filePath, parameters.contenido)

                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: ruta,
                    tipo: isNew ? "add" : "mod",
                    desc: parameters.descripcion
                })

                // Si es un archivo nuevo, actualizar el árbol
                if (isNew) {
                    try {
                        // Actualizar árbol directamente mediante la función
                        const { basic } = await scanProject(paths.PROJECT_BASE)
                        await fs.writeFile(
                            path.join(paths.contextDir, "project_tree.json"),
                            JSON.stringify(basic, null, 2)
                        )

                        debug("Árbol de directorios actualizado automáticamente")
                    } catch (scanError: any) {
                        debug(`Error actualizando árbol de directorios: ${scanError.message}`)
                        // No fallar todo el proceso solo por un error en el escaneo
                    }
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Archivo ${isNew ? "creado" : "modificado"} exitosamente: ${ruta}`
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
        'modificar-archivo',
        "Modifica una parte específica de un archivo",
        {
            description: z.string().describe("Reemplaza texto dentro de un archivo"),
            parameters: z.object({
                ruta: z.string().describe("Ruta relativa al archivo desde la raíz del proyecto"),
                buscar: z.string().describe("Texto a buscar"),
                reemplazar: z.string().describe("Texto de reemplazo"),
                descripcion: z.string().describe("Descripción del cambio para el registro")
            }),
        },
        async ({ parameters }) => {
            try {
                const filePath = path.join(paths.PROJECT_BASE, parameters.ruta)

                await modifyFile(
                    filePath,
                    parameters.buscar,
                    parameters.reemplazar
                )

                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: parameters.ruta,
                    tipo: "mod",
                    desc: parameters.descripcion
                })

                return {
                    content: [
                        {
                            type: "text",
                            text: `Archivo modificado exitosamente: ${parameters.ruta}`
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

    // Herramienta para listar directorio
    server.tool(
        'listar-directorio',
        "Lista el contenido de un directorio",
        {
            description: z.string().describe("Lista archivos y carpetas"),
            parameters: z.object({
                ruta: z.string().describe("Ruta relativa al directorio"),
                recursivo: z.boolean().optional().describe("true: lista subdirectorios")
            }),
        },
        async ({ parameters }) => {
            try {
                // Si la ruta es '.', listar directorios principales del proyecto
                if (parameters.ruta === '.') {
                    // Verificar que los directorios principales existen
                    await fs.ensureDir(path.join(paths.PROJECT_BASE, 'code'))
                    await fs.ensureDir(path.join(paths.PROJECT_BASE, 'mcp'))


                    if (parameters.recursivo) {
                        // Generar árbol completo del proyecto
                        const tree = await generateDirectoryTree(paths.PROJECT_BASE)
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Estructura completa del proyecto:\n\n${tree}`
                                }
                            ]
                        }
                    } else {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Contenido del proyecto:\n\n[DIR] code\n  [DIR] api\n  [DIR] src\n[DIR] mcp\n[DIR] tests`
                                }
                            ]
                        }
                    }
                }

                // Manejar rutas con y sin el prefijo code/
                let ruta = parameters.ruta
                let dirPath = path.join(paths.PROJECT_BASE, ruta)

                // Si no existe y no comienza con code/, intentar con el prefijo
                if (!await fs.pathExists(dirPath) && !ruta.startsWith('code/')) {
                    ruta = `code/${ruta}`
                    dirPath = path.join(paths.PROJECT_BASE, ruta)
                }

                // Si todavía no existe, comprobar si es una ruta dentro de mpc/
                if (!await fs.pathExists(dirPath) && !ruta.startsWith('mcp/')) {
                    const mpcPath = path.join(paths.metaMpcRoot, parameters.ruta)
                    if (await fs.pathExists(mpcPath)) {
                        dirPath = mpcPath
                        ruta = `mcp/${parameters.ruta}`
                    }
                }

                // Si se solicita recursivo, usar generador de árbol
                if (parameters.recursivo) {
                    const tree = await generateDirectoryTree(dirPath)
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Estructura de ${ruta}:\n\n${tree}`
                            }
                        ]
                    }
                } else {
                    // Listar el contenido no recursivamente
                    const files = await listDirectory(dirPath)
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Contenido de ${ruta}:\n\n${files.join('\n')}`
                            }
                        ]
                    }
                }
            } catch (error: any) {
                debug(`Error en listar-directorio: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error al listar directorio: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Herramienta para generar árbol ASCII
    server.tool(
        'generar-arbol-ascii',
        "Genera un árbol visual en formato ASCII",
        {
            description: z.string().describe("Genera representación visual de directorios"),
            parameters: z.object({
                ruta: z.string().describe("Directorio base (code, src, api, etc.)"),
                profundidad: z.number().optional().describe("Nivel máximo de profundidad"),
                guardar: z.boolean().optional().describe("Si es true, guarda el árbol en un archivo")
            }),
        },
        async ({ parameters }) => {
            try {
                // Determinar la ruta a procesar
                let ruta = parameters.ruta
                let dirPath = path.join(paths.PROJECT_BASE, ruta)

                // Si no existe y no comienza con code/, intentar con el prefijo
                if (!await fs.pathExists(dirPath) && !ruta.startsWith('code/')) {
                    ruta = `code/${ruta}`
                    dirPath = path.join(paths.PROJECT_BASE, ruta)
                }

                // Si todavía no existe, comprobar si es una ruta dentro de mpc/
                if (!await fs.pathExists(dirPath) && !ruta.startsWith('mcp/')) {
                    const mpcPath = path.join(paths.metaMpcRoot, parameters.ruta)
                    if (await fs.pathExists(mpcPath)) {
                        dirPath = mpcPath
                        ruta = `mcp/${parameters.ruta}`
                    }
                }

                // Verificar que el directorio existe
                if (!await fs.pathExists(dirPath)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: No se encontró el directorio ${ruta}`
                            }
                        ]
                    }
                }

                // Generar el árbol ASCII
                const maxDepth = parameters.profundidad !== undefined ? parameters.profundidad : Infinity
                const asciiTree = await generateDirectoryTree(dirPath, '', maxDepth)

                // Si se solicitó guardar, escribir a un archivo
                if (parameters.guardar) {
                    const rutaBase = ruta.replace(/\//g, '_').replace(/^_/, '')
                    const outputPath = path.join(paths.contextDir, `arbol_${rutaBase}.txt`)
                    await fs.writeFile(outputPath, `Árbol de directorios para: ${ruta}\n\n${asciiTree}`)

                    await logChange({
                        fecha: new Date().toISOString(),
                        tipo: "system",
                        desc: `Árbol ASCII generado y guardado en ${outputPath}`
                    })

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Árbol ASCII generado para ${ruta} y guardado en ${outputPath}:\n\n${asciiTree}`
                            }
                        ]
                    }
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Árbol ASCII de ${ruta}:\n\n${asciiTree}`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en generar-arbol-ascii: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error generando árbol ASCII: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Herramienta para mover archivos
    server.tool(
        'mover-archivo',
        "Mueve un archivo o directorio a otra ubicación",
        {
            description: z.string().describe("Mueve un archivo o directorio a otra ubicación"),
            parameters: z.object({
                origen: z.string().describe("Ruta relativa al archivo o directorio a mover"),
                destino: z.string().describe("Ruta relativa al nuevo destino"),
                descripcion: z.string().describe("Descripción del cambio para el registro")
            }),
        },
        async ({ parameters }) => {
            try {
                const rutaOrigen = path.join(paths.PROJECT_BASE, parameters.origen)

                // Asegurar que el destino comience con code/ si no es una ruta especial
                let rutaDestino = parameters.destino
                if (!rutaDestino.startsWith('code/') &&
                    !rutaDestino.startsWith('mcp/') &&
                    !rutaDestino.startsWith('tests/')) {
                    rutaDestino = `code/${rutaDestino}`
                }

                const rutaDestinoCompleta = path.join(paths.PROJECT_BASE, rutaDestino)

                // Verificar que el origen existe
                if (!await fs.pathExists(rutaOrigen)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: No se encontró el archivo o directorio de origen: ${parameters.origen}`
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
                    archivo: parameters.origen,
                    tipo: "mod",
                    desc: `Movido de ${parameters.origen} a ${rutaDestino}: ${parameters.descripcion}`
                })

                // Actualizar árbol de directorios
                const { basic } = await scanProject(paths.PROJECT_BASE)
                await fs.writeFile(
                    path.join(paths.contextDir, "project_tree.json"),
                    JSON.stringify(basic, null, 2)
                )

                return {
                    content: [
                        {
                            type: "text",
                            text: `Archivo o directorio movido exitosamente de ${parameters.origen} a ${rutaDestino}`
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