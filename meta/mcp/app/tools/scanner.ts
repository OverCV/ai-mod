// mcp\app\tools\scanner.ts
import fs from 'fs-extra'
import path from 'path'
import { DetailedElement, DetailedNode, IGNORE_DIRS } from '../types/index.js'

/**
 * Escanea un proyecto y genera árboles de directorios
 */
export async function scanProject(rootDir: string):
    Promise<{ detailed: DetailedNode }> {

    // Crear nodo raíz para el árbol detallado
    const detailedRoot: DetailedNode = {
        n: path.basename(rootDir),
        t: 'dir',
        d: 'Raíz del proyecto',
        c: []
    }

    // Escanear directorios de forma recursiva
    await scanDirectory(rootDir, detailedRoot)

    return { detailed: detailedRoot }
}

/**
 * Escanea un directorio de forma recursiva
 */
async function scanDirectory(
    dirPath: string,
    detailedParent: DetailedNode
): Promise<void> {
    try {
        const items = await fs.readdir(dirPath)

        for (const item of items) {
            // Ignorar ciertos directorios
            if (IGNORE_DIRS.includes(item)) {
                continue
            }

            const itemPath = path.join(dirPath, item)
            const stats = await fs.stat(itemPath)

            if (stats.isDirectory()) {

                const detailedNode: DetailedNode = {
                    n: item,
                    t: 'dir',
                    c: []
                }

                detailedParent.c = detailedParent.c || []
                detailedParent.c.push(detailedNode)

                // Escanear recursivamente
                await scanDirectory(itemPath, detailedNode)
            } else {


                const detailedNode: DetailedNode = {
                    n: item,
                    t: 'file'
                }

                // Si es un archivo de código, intentar analizar su contenido
                if (isPythonFile(item) || isJavaScriptFile(item) || isTypeScriptFile(item)) {
                    try {
                        const content = await fs.readFile(itemPath, 'utf-8')
                        const elements = analyzeFileContent(item, content)
                        if (elements.length > 0) {
                            detailedNode.e = elements

                            // Añadir una breve descripción basada en elementos
                            if (elements.length === 1) {
                                detailedNode.d = `Contiene ${elements[0].t === 'cls' ? 'la clase' : 'la función'} ${elements[0].n}`
                            } else {
                                const clsCount = elements.filter(e => e.t === 'cls').length
                                const fnCount = elements.filter(e => e.t === 'fn').length
                                detailedNode.d = `Contiene ${clsCount} clase(s) y ${fnCount} función(es)`
                            }
                        }
                    } catch (error: any) {
                        console.error(`Error analizando archivo ${itemPath}:`, error)
                    }
                }

                detailedParent.c = detailedParent.c || []
                detailedParent.c.push(detailedNode)
            }
        }
    } catch (error: any) {
        console.error(`Error escaneando directorio ${dirPath}:`, error)
    }
}

/**
 * Analiza el contenido de un archivo para extraer funciones y clases
 */
function analyzeFileContent(filename: string, content: string): DetailedElement[] {
    const elements: DetailedElement[] = []

    if (isPythonFile(filename)) {
        // Analizar funciones y clases en Python
        analyzePythonFile(content, elements)
    } else if (isJavaScriptFile(filename) || isTypeScriptFile(filename)) {
        // Analizar funciones y clases en JS/TS
        analyzeJsOrTsFile(content, elements)
    }

    return elements
}

/**
 * Analiza un archivo Python
 */
function analyzePythonFile(content: string, elements: DetailedElement[]): void {
    // Expresión regular para funciones
    const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)(?:\s*->\s*([a-zA-Z0-9_\.]+))?\s*:/g

    // Expresión regular para clases
    const classRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\((.*?)\))?\s*:/g

    // Buscar funciones
    let match
    while ((match = functionRegex.exec(content)) !== null) {
        const name = match[1]
        const params = match[2]
        const returnType = match[3]

        // Buscar docstring (descripción)
        const docMatch = content.substring(match.index + match[0].length).match(/"""(.*?)"""/s)
        const description = docMatch ? docMatch[1].trim() : undefined

        elements.push({
            t: 'fn',
            n: name,
            d: description,
            i: params.split(',').map(p => p.trim()).filter(p => p),
            o: returnType
        })
    }

    // Buscar clases
    while ((match = classRegex.exec(content)) !== null) {
        const name = match[1]
        const inherits = match[2]

        // Buscar docstring (descripción)
        const docMatch = content.substring(match.index + match[0].length).match(/"""(.*?)"""/s)
        const description = docMatch ? docMatch[1].trim() : undefined

        elements.push({
            t: 'cls',
            n: name,
            d: description,
            i: inherits ? inherits.split(',').map(p => p.trim()).filter(p => p) : undefined
        })
    }
}

/**
 * Analiza un archivo JavaScript o TypeScript
 */
function analyzeJsOrTsFile(content: string, elements: DetailedElement[]): void {
    // Expresión regular para funciones (incluyendo arrow functions y métodos)
    const functionRegex = /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)\s*{)/g

    // Expresión regular para clases
    const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*{/g

    // Buscar funciones
    let match
    while ((match = functionRegex.exec(content)) !== null) {
        // Puede ser función declarativa, arrow function o método
        const name = match[1] || match[3] || match[5]
        const params = match[2] || match[4] || match[6]

        if (name) {  // Ignorar funciones anónimas
            // Buscar jsdoc para descripción
            const lines = content.substring(0, match.index).split('\n')
            let desc = undefined
            let returnType = undefined

            // Buscar el último comentario antes de la función
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith('/**') || lines[i].trim().startsWith('/*')) {
                    // Encontramos un comentario, buscar descripción y @return
                    for (let j = i; j < lines.length; j++) {
                        const line = lines[j].trim();
                        if (line.includes('*/')) break;

                        if (!line.startsWith('*') && !line.startsWith('/*')) continue;

                        if (line.includes('@return') || line.includes('@returns')) {
                            returnType = line.replace(/.*@returns?\s*/, '').trim();
                        } else if (!line.startsWith('/**') && !line.startsWith('/*')) {
                            const descLine = line.replace(/^\*\s*/, '').trim();
                            if (descLine && !descLine.startsWith('@')) {
                                desc = desc ? `${desc} ${descLine}` : descLine;
                            }
                        }
                    }
                    break;
                }
            }

            elements.push({
                t: 'fn',
                n: name,
                d: desc,
                i: params.split(',').map(p => p.trim()).filter(p => p),
                o: returnType
            });
        }
    }

    // Buscar clases
    while ((match = classRegex.exec(content)) !== null) {
        const name = match[1];
        const inherits = match[2];

        // Buscar jsdoc para descripción
        const lines = content.substring(0, match.index).split('\n');
        let desc = undefined;

        // Buscar el último comentario antes de la clase
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('/**') || lines[i].trim().startsWith('/*')) {
                // Encontramos un comentario, buscar descripción
                for (let j = i; j < lines.length; j++) {
                    const line = lines[j].trim();
                    if (line.includes('*/')) break;

                    if (!line.startsWith('*') && !line.startsWith('/*')) continue;

                    if (!line.startsWith('/**') && !line.startsWith('/*')) {
                        const descLine = line.replace(/^\*\s*/, '').trim();
                        if (descLine && !descLine.startsWith('@')) {
                            desc = desc ? `${desc} ${descLine}` : descLine;
                        }
                    }
                }
                break;
            }
        }

        elements.push({
            t: 'cls',
            n: name,
            d: desc,
            i: inherits ? [inherits] : undefined
        });
    }
}

/**
 * Verifica si un archivo es Python
 */
function isPythonFile(filename: string): boolean {
    return filename.endsWith('.py');
}

/**
 * Verifica si un archivo es JavaScript
 */
function isJavaScriptFile(filename: string): boolean {
    return filename.endsWith('.js') || filename.endsWith('.jsx');
}

/**
 * Verifica si un archivo es TypeScript
 */
function isTypeScriptFile(filename: string): boolean {
    return filename.endsWith('.ts') || filename.endsWith('.tsx');
}