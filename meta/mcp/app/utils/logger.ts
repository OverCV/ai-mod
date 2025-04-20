// mcp\app\utils\logger.ts
import fs from 'fs-extra';
import path from 'path';
import { info, debug } from './fileLogger.js';
import { ChangeLog } from '../types/index.js';

// Ruta al archivo de log
const LOG_FILE = path.resolve(process.cwd(), '..', 'logs', 'changes_log.jsonl');

/**
 * Registra un cambio en el archivo de log
 */
export async function logChange(change: ChangeLog): Promise<void> {
    try {
        // Asegurar que el archivo existe
        await fs.ensureFile(LOG_FILE);

        // Validar que los tipos sean correctos
        if (change.tipo !== 'add' && change.tipo !== 'mod' && change.tipo !== 'del' &&
            change.tipo !== 'scan' && change.tipo !== 'system') {
            change.tipo = 'system'; // Valor por defecto seguro
        }

        // Convertir el cambio a JSON y añadirlo al archivo
        const logEntry = JSON.stringify(change) + '\n';
        await fs.appendFile(LOG_FILE, logEntry);

        // Registrar en nuestro file logger
        info(`Log: ${change.tipo} - ${change.desc}`);
    } catch (error: any) {
        debug(`Error al registrar cambio: ${error.message}`);
    }
}

/**
 * Lee los últimos N cambios del log
 */
export async function getRecentChanges(count: number = 10): Promise<ChangeLog[]> {
    try {
        if (!await fs.pathExists(LOG_FILE)) {
            return [];
        }

        const content = await fs.readFile(LOG_FILE, 'utf-8');
        const lines = content.trim().split('\n');

        // Tomar las últimas 'count' líneas
        const lastLines = lines.slice(-count);

        // Convertir cada línea a objeto
        return lastLines.map(line => JSON.parse(line));
    } catch (error: any) {
        debug(`Error leyendo log de cambios: ${error.message}`);
        return [];
    }
}