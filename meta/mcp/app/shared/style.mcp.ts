import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { debug } from "../utils/fileLogger.js"
import path from "path"
import fs from "fs-extra"
import paths from "../config/paths.js"
import { scanProject } from "../tools/scanner.js"

// Directorios para estilos
const STYLES_DIR = path.join(paths.mcpApp, "styles")
const PROFILES_DIR = path.join(STYLES_DIR, "profiles")
const PROJECTS_DIR = path.join(STYLES_DIR, "projects")

/**
 * Carga contenido de un archivo si existe, o devuelve un contenido por defecto
 */
async function loadContentOrDefault(filePath: string, defaultContent: string): Promise<string> {
    try {
        if (await fs.pathExists(filePath)) {
            return await fs.readFile(filePath, 'utf-8')
        }
        return defaultContent
    } catch (error) {
        debug(`Error leyendo archivo ${filePath}: ${error}`)
        return defaultContent
    }
}

/**
 * Asegura que todos los directorios necesarios existen
 */
async function ensureDirectories(): Promise<void> {
    await fs.ensureDir(STYLES_DIR)
    await fs.ensureDir(PROFILES_DIR)
    await fs.ensureDir(PROJECTS_DIR)
}

/**
 * Registra herramientas para gestionar estilos y configuración de Claude
 */
export function registerStyleMcp(server: McpServer) {
    // Crear directorios si no existen
    ensureDirectories()

    // Herramienta mcd - Comando principal para inicializar Framework MCP-CODE
    server.tool(
        'mcdp',
        "Inicializa el Model Context Development Protocol (MCP-CODE)",
        {
            params: z.object({
                modo: z.string().optional().describe("Campo de experiencia (back, front, fullstack, etc)"),
                proy: z.string().optional().describe("Tipo de proyecto (web, api, etc.)"),
                extra: z.string().optional().describe("Información adicional para el framework"),
            }),
        },
        async ({ params }) => {
            try {
                const { modo = "senior", proy: proyecto = "general", extra } = params

                // Cargar el framework base
                const frameworkPath = path.join(STYLES_DIR, "meta-code.md")
                const frameworkContent = await loadContentOrDefault(
                    frameworkPath,
                    "# Framework META-CODE\n\nEstructura de proyecto dividida en code/ (implementación) y meta/ (gestión/auto-control)."
                )

                // Cargar el perfil según modo
                const profilePath = path.join(PROFILES_DIR, `${modo}.md`)
                const modoDesc = await loadContentOrDefault(
                    profilePath,
                    `Actuaré según como un ${modo} y sus reglas establecidas.`
                )

                // Cargar la descripción del proyecto
                let projectType = proyecto.toLowerCase()

                const projectPath = path.join(PROJECTS_DIR, `${projectType}.md`)
                const proyectoDesc = await loadContentOrDefault(
                    projectPath,
                    `Este proyecto es de tipo ${proyecto}.`
                )

                // Construir el estilo completo
                let styleOutput = `${frameworkContent}\n\n## Perfil del Asistente:\n\n${modoDesc}\n\n## Enfoque del Proyecto:\n\n${proyectoDesc}`

                // Añadir contexto extra si se proporciona
                if (extra) {
                    styleOutput += `\n\n## Información Adicional\n\n${extra}`
                }

                // Escanear el proyecto para análisis si existe
                let projectContext = ""
                try {
                    // Acá podría ser el ASCII mejor?
                    const { detailed } = await scanProject(paths.codeRoot)
                    if (detailed && detailed.c && detailed.c.length > 0) {
                        projectContext = "Style: Estructura actual analizada."
                    }
                } catch (e) {
                    debug(`Error escaneando proyecto: ${e}`)
                }

                // Registrar uso del comando
                await fs.appendFile(
                    path.join(STYLES_DIR, 'mcd_usage.txt'),
                    `[${new Date().toISOString()}] mcd: modo=${modo}, proyecto=${proyecto}\nestilo="""\n${styleOutput}\n"""\n\n`
                )

                // Aplicar el estilo
                // acá no falta el styleOutput? O cómo realmente se que se aplicó el estilo de trabajo?
                return {
                    content: [
                        {
                            type: "text",
                            text: `# Inicialización de Framework MCP-CODE

${styleOutput}

Estoy configurado para asistirte como un **${modo.toUpperCase()}** en desarrollo de proyectos de **${proyecto.toUpperCase()}**.

A partir de ahora, seguiré el Framework MCP-CODE como base para nuestro trabajo. Esto implica:

1. Organización clara entre código (code/) y gestión (mcp/)
2. Seguimiento de features estructurado
3. Pruebas organizadas y completas
4. Documentación clara del proyecto

**¿Cómo quieres comenzar?** Puedo:
- Revisar la estructura actual
- Crear una nueva feature
- Sugerir mejoras arquitectónicas
- Implementar una tarea específica`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en mcd: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error inicializando framework: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Listar perfiles disponibles
    server.tool(
        'listar-perfiles',
        "Lista todos los perfiles disponibles para mcd",
        {
            params: z.object({}),
        },
        async () => {
            try {
                // Crear directorios si no existen
                await ensureDirectories()

                // Leer todos los archivos .md en el directorio de perfiles
                const files = await fs.readdir(PROFILES_DIR)
                const profiles = files.filter(file => file.endsWith('.md'))

                if (profiles.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No hay perfiles disponibles. Puedes crear uno nuevo con 'crear-perfil'."
                            }
                        ]
                    }
                }

                // Para cada perfil, leer la primera línea para obtener el título
                const profileInfo = await Promise.all(profiles.map(async (profile) => {
                    const content = await fs.readFile(path.join(PROFILES_DIR, profile), 'utf-8')
                    const firstLine = content.split('\n')[0].replace(/^#\s*/, '')
                    return {
                        nombre: profile.replace('.md', ''),
                        titulo: firstLine || profile
                    }
                }))

                let response = "## Perfiles Disponibles\n\n"
                profileInfo.forEach(profile => {
                    response += `- **${profile.nombre}**: ${profile.titulo}\n`
                })

                return {
                    content: [
                        {
                            type: "text",
                            text: response
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en listar-perfiles: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error listando perfiles: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Listar tipos de proyecto disponibles
    server.tool(
        'listar-proyectos',
        "Lista todos los tipos de proyecto disponibles para mcd. Muestra los tipos de proyecto que se pueden aplicar",
        {
            params: z.object({}),
        },
        async () => {
            try {
                // Crear directorios si no existen
                await ensureDirectories()

                // Leer todos los archivos .md en el directorio de proyectos
                const files = await fs.readdir(PROJECTS_DIR)
                const projects = files.filter(file => file.endsWith('.md'))

                if (projects.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No hay tipos de proyecto disponibles. Puedes crear uno nuevo con 'crear-proyecto'."
                            }
                        ]
                    }
                }

                // Para cada tipo de proyecto, leer la primera línea para obtener el título
                const projectInfo = await Promise.all(projects.map(async (project) => {
                    const content = await fs.readFile(path.join(PROJECTS_DIR, project), 'utf-8')
                    const firstLine = content.split('\n')[0].replace(/^#\s*/, '')
                    return {
                        nombre: project.replace('.md', ''),
                        titulo: firstLine || project
                    }
                }))

                let response = "## Tipos de Proyecto Disponibles\n\n"
                projectInfo.forEach(project => {
                    response += `- **${project.nombre}**: ${project.titulo}\n`
                })

                return {
                    content: [
                        {
                            type: "text",
                            text: response
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en listar-proyectos: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error listando tipos de proyecto: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Crear un nuevo perfil
    server.tool(
        'estilo-perfil',
        "Crea un nuevo perfil de desarrollador. Guarda un perfil para uso con mcdp",
        {
            params: z.object({
                nombre: z.string().describe("Nombre único para el perfil (ej: arquitecto)"),
                contenido: z.string().describe("Contenido markdown del perfil"),
                descripcion: z.string().optional().describe("Breve descripción del perfil")
            }),
        },
        async ({ params }) => {
            try {
                const { nombre, contenido, descripcion } = params

                // Crear directorios si no existen
                await ensureDirectories()

                const profilePath = path.join(PROFILES_DIR, `${nombre}.md`)

                // Verificar si ya existe
                if (await fs.pathExists(profilePath)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Ya existe un perfil llamado "${nombre}". Usa otro nombre o elimina el existente primero.`
                            }
                        ]
                    }
                }

                // Añadir descripción como título si se proporciona
                let finalContent = contenido
                if (descripcion && !contenido.includes(descripcion)) {
                    finalContent = `# ${descripcion}\n\n${contenido}`
                }

                // Guardar perfil
                await fs.writeFile(profilePath, finalContent)

                return {
                    content: [
                        {
                            type: "text",
                            text: `Perfil "${nombre}" creado exitosamente. Puedes usarlo con 'mcd con modo="${nombre}"'.`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en crear-perfil: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error creando perfil: ${error.message}`
                        }
                    ]
                }
            }
        }
    )

    // Crear un nuevo tipo de proyecto
    server.tool(
        'estilo-proyecto',
        "Crea un nuevo tipo de proyecto. Guarda un tipo de proyecto para uso con mcdp",
        {
            params: z.object({
                nombre: z.string().describe("Nombre único para el tipo de proyecto (ej: api)"),
                contenido: z.string().describe("Contenido markdown con el enfoque del proyecto"),
                descripcion: z.string().optional().describe("Breve descripción del proyecto")
            }),
        },
        async ({ params }) => {
            try {
                const { nombre, contenido, descripcion } = params

                // Crear directorios si no existen
                await ensureDirectories()

                const projectPath = path.join(PROJECTS_DIR, `${nombre}.md`)

                // Verificar si ya existe
                if (await fs.pathExists(projectPath)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Ya existe un tipo de proyecto llamado "${nombre}". Usa otro nombre o elimina el existente primero.`
                            }
                        ]
                    }
                }

                // Añadir descripción como título si se proporciona
                let finalContent = contenido
                if (descripcion && !contenido.includes(descripcion)) {
                    finalContent = `# ${descripcion}\n\n${contenido}`
                }

                // Guardar tipo de proyecto
                await fs.writeFile(projectPath, finalContent)

                return {
                    content: [
                        {
                            type: "text",
                            text: `Tipo de proyecto "${nombre}" creado exitosamente. Puedes usarlo con 'mcd con proyecto="${nombre}"'.`
                        }
                    ]
                }
            } catch (error: any) {
                debug(`Error en crear-proyecto: ${error.message}`)
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error creando tipo de proyecto: ${error.message}`
                        }
                    ]
                }
            }
        }
    )
}