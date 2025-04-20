// mcp\app\main.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import dotenv from 'dotenv'
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import fs from "fs-extra"
import path from "path"
import { initLogger, info, error } from "./utils/fileLogger.js"
import { paths } from "./config/paths.js"
import { registerAllTools } from "./shared/.index.js"

// Inicializar el logger
initLogger(paths.logsDir)

// Logging de rutas en archivo (no en consola)
info(`MCP iniciando con las siguientes rutas ABSOLUTAS:
- PROJECT_BASE: ${paths.PROJECT_BASE}
- mpcRoot: ${paths.metaMpcRoot}
- mcpApp: ${paths.mcpApp}
- codeRoot: ${paths.codeRoot}
- contextDir: ${paths.metaContextDir}
- trackingDir: ${paths.metaTrackingDir}
- logsDir: ${paths.logsDir}
`)

// Asegurar que existen los directorios necesarios
async function ensureDirectories() {
    await fs.ensureDir(paths.metaContextDir)
    await fs.ensureDir(paths.metaTrackingDir)
    await fs.ensureDir(path.join(paths.metaTrackingDir, "features"))
    await fs.ensureDir(paths.logsDir)
    await fs.ensureDir(paths.codeRoot)
    await fs.ensureDir(paths.mcpApp)

    // Crear archivos básicos si no existen
    const statusPath = path.join(paths.metaTrackingDir, "status.yaml")
    if (!await fs.pathExists(statusPath)) {
        await fs.writeFile(
            statusPath,
            `nombre: "Sistema agentico de MCP"
version: "0.0.1"
actualizacion: "${new Date().toISOString().split('T')[0]}"
progreso_global: 0
funcionalidades_activas: []
proximos_objetivos: []
notas: "Iniciando proyecto"`
        )
    }
}

// Crear el servidor MCP
async function startServer() {
    await ensureDirectories()

    const server = new McpServer({
        name: "MetaMCP",
        version: "0.2.1",
        port: 4000,
    })

    // Registrar todas las herramientas
    registerAllTools(server)

    // Conectar con el transporte
    const transport = new StdioServerTransport()
    await server.connect(transport)

    // No usar console.log aquí - interfiere con el protocolo
    info("Servidor MetaMCP iniciado")
}

// Iniciar el servidor
startServer().catch(err => {
    error("Error iniciando servidor MetaMCP:", err)
    process.exit(1)
})