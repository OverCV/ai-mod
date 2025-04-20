import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Navegar hacia root
const PROJECT_BASE = path.resolve(__dirname, '../../../../')
console.log(`PROJECT_BASE:: ${PROJECT_BASE}`)

export const codeRoot = `${PROJECT_BASE}/code`
export const metaMpcRoot = `${PROJECT_BASE}/meta/mcp`

export const metaContextDir = `${metaMpcRoot}/context`
export const codeContextDir = `${codeRoot}/context`

export const codeTrackingDir = `${codeRoot}/tracking`
export const metaTrackingDir = `${metaMpcRoot}/tracking`

export const mcpApp = `${metaMpcRoot}/app`
export const logsDir = `${metaMpcRoot}/logs`
export const githubConfigPath = path.join(metaMpcRoot, "github.json")

// Exportar todas las rutas como objeto
export const paths = {
    PROJECT_BASE,

    metaMpcRoot,
    codeRoot,

    metaContextDir,
    codeContextDir,

    metaTrackingDir,
    codeTrackingDir,

    mcpApp,
    logsDir,
    githubConfigPath,
}

export default paths