import * as winston from 'winston';
import * as path from 'path';

// Configurar logger
export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [
        // Escribir a archivo
        new winston.transports.File({
            filename: path.resolve(__dirname, '../logs/orchestrator.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
        }),
        // Salida a consola
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(info => `${info.timestamp} [${info.level}] ${info.message}`)
            )
        })
    ]
});