// mcp\app\shared\index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { registerScanMcp } from "./scan.mcp.js"
import { registerFileMcp } from "./files.mcp.js"
import { registerFeaturesMcp } from "./features.mcp.js"
import { registerGithubMcp } from "./git.mcp.js"
import { registerSystemMcp } from "./sys.mcp.js"
import { registerDatabaseMcp } from "./database.mcp.js"
import { registerStyleMcp } from "./style.mcp.js"

/**
 * Registra todas las herramientas MCP en el servidor
 */
export function registerAllTools(server: McpServer) {
    registerSystemMcp(server)
    registerScanMcp(server)
    registerFileMcp(server)
    registerFeaturesMcp(server)
    registerGithubMcp(server)
    registerDatabaseMcp(server)
    registerStyleMcp(server)
}