// mcp\app\shared\git.mcp.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logChange } from "../utils/logger.js";
import { debug } from "../utils/fileLogger.js";

import paths from "../config/paths.js";
import {
    checkoutBranch,
    commitAndPush,
    createBranch,
    getBranches,
    initGitRepo,
    isGitRepo,
    readGitHubConfig,
} from "../tools/github.js";
import { GitHubConfig } from "../types/index.js";

/**
 * Registra la herramienta de escaneo de proyecto en el servidor MCP
 */
export function registerGithubMcp(server: McpServer) {
    // Herramienta para configurar GitHub >> Debería ser desde el ENV!
    // server.tool(
    //     'configurar-github',
    //     "Configura la integración con GitHub",
    //     {
    //         description: z.string().describe("Configura la integración con GitHub"),
    //         parameters: z.object({
    //             token: z.string().describe("Token de acceso personal de GitHub"),
    //             owner: z.string().describe("Propietario del repositorio"),
    //             repo: z.string().describe("Nombre del repositorio"),
    //             branch: z.string().optional().describe("Rama principal (default: main)")
    //         }),
    //     },
    //     async ({ parameters }) => {
    //         try {
    //             // Extraer el nombre del repositorio sin la URL completa si se proporcionó así
    //             let repoName = parameters.repo
    //             if (repoName.includes('github.com')) {
    //                 // Extrae el nombre del repositorio de la URL
    //                 const urlParts = repoName.split('/')
    //                 repoName = urlParts[urlParts.length - 1]
    //                 // Eliminar .git si está presente
    //                 if (repoName.endsWith('.git')) {
    //                     repoName = repoName.slice(0, -4)
    //                 }
    //             }

    //             const config = {
    //                 token: parameters.token,
    //                 owner: parameters.owner,
    //                 repo: repoName,
    //                 branch: parameters.branch || 'main'
    //             }

    //             // Log sin mostrar el token
    //             debug(`Configurando GitHub: owner=${config.owner}, repo=${config.repo}, branch=${config.branch}`)

    //             await saveGitHubConfig(paths.githubConfigPath, config)

    //             await logChange({
    //                 fecha: new Date().toISOString(),
    //                 tipo: "system",
    //                 desc: "Configuración de GitHub actualizada"
    //             })

    //             return {
    //                 content: [
    //                     {
    //                         type: "text",
    //                         text: `Configuración de GitHub guardada exitosamente para el repositorio ${config.owner}/${config.repo}`
    //                     }
    //                 ]
    //             }
    //         } catch (error: any) {
    //             debug(`Error en configurar-github: ${error.message}`)
    //             return {
    //                 content: [
    //                     {
    //                         type: "text",
    //                         text: `Error al configurar GitHub: ${error.message}`
    //                     }
    //                 ]
    //             }
    //         }
    //     }
    // )

    // Herramienta para hacer commit y push a GitHub
    server.tool(
        'commit-push',
        "Realiza commit y push de los cambios a GitHub. Guarda cambios en GitHub",
        {
            parameters: z.object({
                mensaje: z.string().describe("Mensaje del commit")
            }),
        },
        async ({ parameters }) => {
            try {
                // Leer configuración
                const config = await readGitHubConfig(paths.githubConfigPath)

                if (!config) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No se encontró configuración de GitHub. Ejecuta 'configurar-github' primero."
                            }
                        ]
                    }
                }

                // Verificar si es un repositorio git
                if (!await isGitRepo(paths.PROJECT_BASE)) {
                    await initGitRepo(paths.PROJECT_BASE)
                }

                // Commit y push
                const result = await commitAndPush(paths.PROJECT_BASE, parameters.mensaje, config)

                if (result) {
                    await logChange({
                        fecha: new Date().toISOString(),
                        tipo: "system",
                        desc: `Commit y push exitosos: ${parameters.mensaje}`
                    })

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Cambios guardados exitosamente en GitHub: ${parameters.mensaje}`
                            }
                        ]
                    }
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No hay cambios para guardar o se produjo un error."
                            }
                        ]
                    }
                }
            } catch (error: any) {
                debug(`Error en commit-push: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error en commit y push: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Herramienta para gestionar ramas
    server.tool(
        'gestionar-rama',
        "Gestiona ramas de Git. Crea o cambia a una rama",
        {
            parameters: z.object({
                nombre: z.string().describe("Nombre de la rama"),
                crear: z.boolean().optional().describe("Si es true, crea la rama si no existe")
            }),
        },
        async ({ parameters }) => {
            try {
                // Verificar si es un repositorio git
                if (!await isGitRepo(paths.PROJECT_BASE)) {
                    await initGitRepo(paths.PROJECT_BASE)

                    return {
                        content: [
                            {
                                type: "text",
                                text: "Se inicializó un nuevo repositorio git. Ejecuta 'configurar-github' para vincularlo con GitHub."
                            }
                        ]
                    }
                }

                // Obtener ramas existentes
                const branches = await getBranches(paths.PROJECT_BASE)

                if (branches.includes(parameters.nombre)) {
                    // La rama existe, cambiar a ella
                    await checkoutBranch(paths.PROJECT_BASE, parameters.nombre)

                    await logChange({
                        fecha: new Date().toISOString(),
                        tipo: "system",
                        desc: `Cambiado a rama: ${parameters.nombre}`
                    })

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Cambiado exitosamente a la rama: ${parameters.nombre}`
                            }
                        ]
                    }
                } else if (parameters.crear) {
                    // Crear nueva rama
                    await createBranch(paths.PROJECT_BASE, parameters.nombre)

                    await logChange({
                        fecha: new Date().toISOString(),
                        tipo: "system",
                        desc: `Creada y cambiado a rama: ${parameters.nombre}`
                    })

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Rama creada exitosamente: ${parameters.nombre}`
                            }
                        ]
                    }
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `La rama ${parameters.nombre} no existe. Agrega 'crear: true' para crearla.`
                            }
                        ]
                    }
                }
            } catch (error: any) {
                debug(`Error en gestionar-rama: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error gestionando rama: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // todo: Herramienta para pull requests
}

