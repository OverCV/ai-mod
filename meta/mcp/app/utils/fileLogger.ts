// mcp\app\utils\fileLogger.ts
import fs from 'fs-extra';
import path from 'path';

// Ruta al archivo de log
let LOG_FILE = path.resolve(process.cwd(), '..', 'logs', 'debug.log');

// Inicializar el logger
export function initLogger(logDir: string) {
    LOG_FILE = path.resolve(logDir, 'debug.log');
    fs.ensureDirSync(path.dirname(LOG_FILE));

    // Escribir mensaje inicial
    fs.appendFileSync(LOG_FILE, `\n[${new Date().toISOString()}] === MCP INICIADO ===\n`);
}

// Función para log de debug
export function debug(message: string) {
    try {
        const logEntry = `[${new Date().toISOString()}] [DEBUG] ${message}\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        // No podemos usar console.log aquí
    }
}

// Función para log de info
export function info(message: string) {
    try {
        const logEntry = `[${new Date().toISOString()}] [INFO] ${message}\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        // No podemos usar console.log aquí
    }
}

// Función para log de error
export function error(message: string, err?: any) {
    try {
        let logEntry = `[${new Date().toISOString()}] [ERROR] ${message}\n`;
        if (err) {
            logEntry += `${err.stack || err.message || JSON.stringify(err)}\n`;
        }
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        // No podemos usar console.log aquí
    }
}