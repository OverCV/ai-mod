import * as fs from 'fs-extra';
import * as path from 'path';
import { setupEnvironment } from './fix-env';
import { McpRunner } from './mcp-runner';
import { logger } from './logger';

/**
 * Configura la integración con GitHub
 */
export async function setupGitHub(): Promise<boolean> {
    try {
        // Cargar variables de entorno
        setupEnvironment();

        const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN;

        if (!githubToken) {
            logger.error('No se encontró token de GitHub. Configure GITHUB_TOKEN o GITHUB_APP_TOKEN en .env');
            return false;
        }

        // Verificar configuración actual de GitHub usando MCP
        const mcpRunner = new McpRunner(parseInt(process.env.MCP_PORT || '4000'));

        // Crear o actualizar configuración de GitHub usando MCP
        logger.info('Configurando GitHub en MCP...');

        // Ejecutar comando de configuración de GitHub
        const result = await mcpRunner.runTool('configurar-github', {
            token: githubToken,
            owner: process.env.GITHUB_OWNER || 'default-owner',
            repo: process.env.GITHUB_REPO || 'cardio-project',
            branch: process.env.GITHUB_BRANCH || 'main'
        });

        if (!result) {
            logger.error('No se pudo configurar GitHub en MCP');
            return false;
        }

        logger.info('GitHub configurado correctamente');
        return true;
    } catch (error) {
        logger.error('Error configurando GitHub:', error);
        return false;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setupGitHub().then(success => {
        if (success) {
            console.log('✅ GitHub configurado correctamente');
        } else {
            console.error('❌ Error configurando GitHub');
        }
    });
}