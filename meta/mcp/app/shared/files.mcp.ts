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
        'archivo-leer',
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
        "Crea un archivo condicionado por los tokensde respuesta",
        {
            description: z.string().describe("Escribe contenido en un archivo"),
            parameters: z.object({
                en_code: z.boolean().describe("La ruta actual es en `code/`? sino será `meta/mpc/` (desde la raíz)(usado para el escaneo)"),
                ruta: z.string().describe("Ruta relativa del proyecto raíz al archivo"),
                descripcion: z.string().describe("Descripción del cambio para el registro"),
                contenido: z.string().describe("Contenido a escribir en el archivo"),
                // intencion: z.enum(["implement", "def-mcp"])
            }),
        },
        async ({ parameters: params }) => {
            try {

                // todo: Primero debemos escanear el proyecto para asegurarnos de que la ruta es válida (el archivo no exista en otro lado)

                // todo: Hacer bien esta parte indicando al modelo que pues si se crea un archivo se valida que no esté, si está pues debería volver y retornar que haga un modificar. Por otro lado si no está y de verdad no hay un objetivo TRAS HACER el escaneo del árbol , entonces sí se crea, si no está se retorna diciendo que se debe crear dicha subtarea en la feature, pero pues si ya estaba es crearlo y retorna que actualice el arbol detallado porque en dihca ruta ya está y así no se va a repetir el coso, así como en el ascii, algo así es la idea.

                // Ahora usar la ruta corregida (base + prefijo + ruta)
                const dirPath = params.en_code ? paths.codeRoot : paths.metaMpcRoot
                const filePath = path.join(paths.PROJECT_BASE, dirPath!, params.ruta)
                // Si el prefijo es mcp, usar la ruta de mcp


                await writeFile(filePath, params.contenido)
                await logChange({
                    fecha: new Date().toISOString(),
                    archivo: filePath,
                    tipo: "add",
                    desc: params.descripcion
                })
                // todo: actualizar las tareas de la feature porque se hizo esta subtarea, así mismo con editar
                // await updateFeatureTask(parameters.intencion, parameters.ruta, parameters.descripcion)

                const isNew = !await fs.pathExists(filePath)
                // Si es un archivo nuevo, actualizar el árbol
                if (isNew) {
                    try {
                        // Actualizar árbol directamente mediante la función
                        const contextPath = params.en_code ? paths.codeContextDir : paths.metaContextDir

                        const { detailed } = await scanProject(contextPath)

                        await fs.writeFile(
                            path.join(contextPath, `project_tree_full_${params.en_code ? 'code' : 'mcp'}.json`),
                            JSON.stringify(detailed, null, 2)
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
        "Modifica una parte específica de un archivo",
        {
            description: z.string().describe("Reemplaza texto dentro de un archivo"),
            parameters: z.object({
                ruta: z.string().describe("Ruta relativa al archivo desde la raíz del proyecto"),
                buscar: z.string().describe("Texto a buscar"),
                descripcion: z.string().describe("Descripción del cambio para el registro"),
                reemplazar: z.string().describe("Texto de reemplazo"),
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
        'directorio-listar',
        "Lista el contenido de un directorio",
        {
            description: z.string().describe("Lista archivos y carpetas"),
            parameters: z.object({
                ruta: z.string().describe("Ruta relativa al prefijo"),
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
        // todo: el arbol no debería estar acá sino en los nodos
        'arbol-ascii-crear',
        "Genera un árbol visual en formato ASCII",
        {
            description: z.string().describe("Genera representación visual de directorios"),
            parameters: z.object({
                en_code: z.boolean().describe("La ruta actual es en `code/`? sino será `meta/mpc/` (desde la raíz)(usado para el escaneo)"),
                // ruta: z.string().describe("Directorio base (code, src, api, etc.)"),
                guardar: z.boolean().optional().describe("Si es true, guarda el árbol en un archivo")
            }),
        },
        async ({ parameters }) => {
            try {
                // Determinar la ruta a procesar
                let ruta = parameters.en_code ? paths.codeRoot : paths.metaMpcRoot
                let dirPath = path.join(paths.PROJECT_BASE, ruta)

                // Si no existe y no comienza con code/, intentar con el prefijo
                if (!await fs.pathExists(dirPath) && !ruta.startsWith('code/')) {
                    ruta = `code/${ruta}`
                    dirPath = path.join(paths.PROJECT_BASE, ruta)
                }

                // Si existe pero vacio, nada entonces retornar el padre y mensajito de error
                if (await fs.pathExists(dirPath) && (await fs.readdir(dirPath)).length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error:\n└── ${paths.PROJECT_BASE}/.\nEl directorio ${ruta} está vacío.`
                            }
                        ]
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
                const asciiTree = await generateDirectoryTree(dirPath, '')

                // Si se solicitó guardar, escribir a un archivo
                if (parameters.guardar) {
                    const rutaBase = ruta.replace(/\//g, '_').replace(/^_/, '')
                    const outputPath = path.join(paths.metaContextDir, `arbol_${rutaBase}.txt`)
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
                const { detailed } = await scanProject(paths.PROJECT_BASE)
                await fs.writeFile(
                    path.join(paths.metaContextDir, "project_tree.json"),
                    JSON.stringify(detailed, null, 2)
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
    // todo: falta el eliminar carpeta o archivo, pero eso se hace con el delete de fs-extra, no es necesario crear una herramienta para eso, solo se usa el delete y ya está.
}