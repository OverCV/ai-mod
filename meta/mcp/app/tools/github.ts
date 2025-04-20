// mcp\app\tools\github.ts
import fs from 'fs-extra';
import path from 'path';
import { GitHubConfig } from '../types/index.js';

/**
 * Lee la configuración de GitHub
 */
export async function readGitHubConfig(configPath: string): Promise<GitHubConfig | null> {
    try {
        if (await fs.pathExists(configPath)) {
            const content = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(content) as GitHubConfig;
        }
        return null;
    } catch (error: any) {
        console.error(`Error leyendo configuración de GitHub: ${error.message}`);
        return null;
    }
}

/**
 * Guarda la configuración de GitHub
 */
export async function saveGitHubConfig(configPath: string, config: GitHubConfig): Promise<void> {
    try {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error: any) {
        throw new Error(`Error guardando configuración de GitHub: ${error.message}`);
    }
}

/**
 * Ejecuta un comando git en el directorio del proyecto
 */
export async function execGit(projectRoot: string, command: string[]): Promise<string> {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);

    try {
        const { stdout, stderr } = await execAsync(`git ${command.join(' ')}`, {
            cwd: projectRoot
        });

        if (stderr) {
            console.warn(`Git warning: ${stderr}`);
        }

        return stdout.trim();
    } catch (error: any) {
        throw new Error(`Error ejecutando git ${command.join(' ')}: ${error.message}`);
    }
}

/**
 * Verifica si un directorio es un repositorio git
 */
export async function isGitRepo(projectRoot: string): Promise<boolean> {
    try {
        await execGit(projectRoot, ['rev-parse', '--is-inside-work-tree']);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Inicializa un repositorio git si no existe
 */
export async function initGitRepo(projectRoot: string): Promise<void> {
    if (!(await isGitRepo(projectRoot))) {
        await execGit(projectRoot, ['init']);
    }
}

/**
 * Obtiene el estado actual del repositorio
 */
export async function getGitStatus(projectRoot: string): Promise<string> {
    return await execGit(projectRoot, ['status', '--porcelain']);
}

/**
 * Añade archivos al área de preparación
 */
export async function gitAdd(projectRoot: string, files: string[] = ['.']): Promise<void> {
    await execGit(projectRoot, ['add', ...files]);
}

/**
 * Crea un commit con los cambios actuales
 */
export async function gitCommit(projectRoot: string, message: string): Promise<void> {
    await execGit(projectRoot, ['commit', '-m', `"${message}"`]);
}

/**
 * Configura el repositorio remoto
 */
export async function setupRemote(
    projectRoot: string,
    config: GitHubConfig
): Promise<void> {
    try {
        // Verificar si ya existe un remoto
        const remotes = await execGit(projectRoot, ['remote']);

        if (remotes.includes('origin')) {
            // Actualizar URL del remoto existente
            await execGit(
                projectRoot,
                ['remote', 'set-url', 'origin', `https://${config.token}@github.com/${config.owner}/${config.repo}.git`]
            );
        } else {
            // Añadir nuevo remoto
            await execGit(
                projectRoot,
                ['remote', 'add', 'origin', `https://${config.token}@github.com/${config.owner}/${config.repo}.git`]
            );
        }
    } catch (error: any) {
        throw new Error(`Error configurando remoto: ${error.message}`);
    }
}

/**
 * Realiza un push de los cambios al remoto
 */
export async function gitPush(
    projectRoot: string,
    branch: string = 'main'
): Promise<void> {
    await execGit(projectRoot, ['push', 'origin', branch]);
}

/**
 * Realiza un pull de los cambios desde el remoto
 */
export async function gitPull(
    projectRoot: string,
    branch: string = 'main'
): Promise<void> {
    await execGit(projectRoot, ['pull', 'origin', branch]);
}

/**
 * Obtiene la lista de ramas
 */
export async function getBranches(projectRoot: string): Promise<string[]> {
    const output = await execGit(projectRoot, ['branch']);
    return output
        .split('\n')
        .map(branch => branch.trim().replace(/^\*\s+/, ''))
        .filter(branch => branch);
}

/**
 * Crea una nueva rama
 */
export async function createBranch(
    projectRoot: string,
    branchName: string
): Promise<void> {
    await execGit(projectRoot, ['checkout', '-b', branchName]);
}

/**
 * Cambia a una rama existente
 */
export async function checkoutBranch(
    projectRoot: string,
    branchName: string
): Promise<void> {
    await execGit(projectRoot, ['checkout', branchName]);
}

/**
 * Realiza un commit y push de los cambios
 */
export async function commitAndPush(
    projectRoot: string,
    message: string,
    config: GitHubConfig
): Promise<boolean> {
    try {
        // Verificar estado
        const status = await getGitStatus(projectRoot);
        if (!status) {
            return false; // No hay cambios para commitear
        }

        // Añadir cambios
        await gitAdd(projectRoot);

        // Commit
        await gitCommit(projectRoot, message);

        // Push
        await setupRemote(projectRoot, config);
        await gitPush(projectRoot, config.branch);

        return true;
    } catch (error: any) {
        console.error(`Error en commit y push: ${error.message}`);
        return false;
    }
}