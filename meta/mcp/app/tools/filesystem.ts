// mcp\app\tools\filesystem.ts
import fs from 'fs-extra'
import path from 'path'
import { IGNORE_DIRS } from '../types/index.js'

/**
 * Lee el contenido de un archivo
 */
export async function readFile(filePath: string): Promise<string> {
    try {
        return await fs.readFile(filePath, 'utf-8')
    } catch (error: any) {
        throw new Error(`Error leyendo archivo ${filePath}: ${error.message}`)
    }
}

/**
 * Escribe contenido en un archivo
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        // Asegurarse que el directorio existe
        await fs.ensureDir(path.dirname(filePath))

        // Escribir el archivo
        await fs.writeFile(filePath, content)
    } catch (error: any) {
        throw new Error(`Error escribiendo archivo ${filePath}: ${error.message}`)
    }
}

/**
 * Modifica una parte específica de un archivo
 */
export async function modifyFile(filePath: string, search: string, replace: string): Promise<void> {
    try {
        // Leer contenido actual
        const content = await readFile(filePath)

        // Comprobar si el texto a buscar existe
        if (!content.includes(search)) {
            throw new Error(`El texto a buscar no se encontró en el archivo ${filePath}`)
        }

        // Reemplazar y guardar
        const newContent = content.replace(search, replace)
        await writeFile(filePath, newContent)
    } catch (error: any) {
        throw new Error(`Error modificando archivo ${filePath}: ${error.message}`)
    }
}

/**
 * Lista archivos y carpetas en un directorio
 */
export async function listDirectory(dirPath: string): Promise<string[]> {
    try {
        const items = await fs.readdir(dirPath)

        // Obtener información de cada item
        const itemsInfo = await Promise.all(
            items.map(async item => {
                const itemPath = path.join(dirPath, item)
                const stats = await fs.stat(itemPath)
                return {
                    name: item,
                    isDirectory: stats.isDirectory()
                }
            })
        )

        // Formateamos la salida
        return itemsInfo.map(item =>
            `${item.isDirectory ? '[DIR]' : '[FILE]'} ${item.name}`
        )
    } catch (error: any) {
        throw new Error(`Error listando directorio ${dirPath}: ${error.message}`)
    }
}

/**
 * Elimina un archivo o directorio
 */
export async function deleteFileOrDir(targetPath: string): Promise<void> {
    try {
        await fs.remove(targetPath)
    } catch (error: any) {
        throw new Error(`Error eliminando ${targetPath}: ${error.message}`)
    }
}

/**
 * Crea un directorio
 */
export async function createDirectory(dirPath: string): Promise<void> {
    try {
        await fs.ensureDir(dirPath)
    } catch (error: any) {
        throw new Error(`Error creando directorio ${dirPath}: ${error.message}`)
    }
}

/**
 * Genera un árbol de directorios en formato ASCII
 * @param dirPath Ruta del directorio a escanear
 * @param prefix Prefijo para la representación del árbol
 * @param maxDepth Profundidad máxima para el escaneo
 * @param currentDepth Profundidad actual (usado en la recursión)
 */
export async function generateDirectoryTree(
    dirPath: string,
    prefix: string = '',
    maxDepth: number = Infinity,
    currentDepth: number = 0
): Promise<string> {
    if (currentDepth > maxDepth) {
        return '';
    }

    try {
        const items = await fs.readdir(dirPath);
        let result = '';

        // Filtrar para ignorar directorios específicos
        const filteredItems = items.filter(item => !IGNORE_DIRS.includes(item));

        for (let i = 0; i < filteredItems.length; i++) {
            const item = filteredItems[i];
            const itemPath = path.join(dirPath, item);
            const isLastItem = i === filteredItems.length - 1;

            // Símbolos para el árbol ASCII
            const connector = isLastItem ? '└── ' : '├── ';
            const childPrefix = isLastItem ? '    ' : '│   ';

            try {
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    // Es un directorio
                    result += `${prefix}${connector}${item}/\n`;

                    // Recursión para subdirectorios
                    if (currentDepth < maxDepth) {
                        const subtree = await generateDirectoryTree(
                            itemPath,
                            prefix + childPrefix,
                            maxDepth,
                            currentDepth + 1
                        );
                        result += subtree;
                    }
                } else {
                    // Es un archivo
                    result += `${prefix}${connector}${item}\n`;
                }
            } catch (error) {
                // Si hay error al acceder al archivo, mostrar como inaccesible
                result += `${prefix}${connector}${item} [error: inaccesible]\n`;
            }
        }

        return result;
    } catch (error) {
        return `${prefix}[Error: No se puede acceder al directorio]\n`;
    }
}