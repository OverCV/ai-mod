// mcp\app\config\paths.ts
import path from 'path';

// Rutas base - VERSIÓN SIMPLIFICADA CON RUTAS ABSOLUTAS
export const PROJECT_BASE = "C:/Users/overd/Links/Academia/MCP/int-0"; // Ruta ABSOLUTA al proyecto
export const codeRoot = `${PROJECT_BASE}/code`;

export const metaMpcRoot = `${PROJECT_BASE}/meta/mcp`;
export const mcpApp = `${metaMpcRoot}/app`;
export const contextDir = `${metaMpcRoot}/context`;
export const trackingDir = `${metaMpcRoot}/tracking`;
export const logsDir = `${metaMpcRoot}/logs`;
export const githubConfigPath = path.join(metaMpcRoot, "github.json");

// Exportar todas las rutas como objeto
export const paths = {
    PROJECT_BASE,
    metaMpcRoot,
    mcpApp,
    codeRoot,
    contextDir,
    trackingDir,
    logsDir,
    githubConfigPath,
};

export default paths;