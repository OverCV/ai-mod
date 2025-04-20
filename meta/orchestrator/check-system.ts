import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { setupEnvironment } from './fix-env';
import { McpRunner } from './mcp-runner';

// Configurar variables de entorno
setupEnvironment();

/**
 * Verifica el estado completo del sistema
 */
async function checkSystem() {
    console.log('\n🔍 VERIFICACIÓN DEL SISTEMA DE DESARROLLO CARDIOVASCULAR\n');

    // 1. Verificar variables de entorno
    console.log('1️⃣ VARIABLES DE ENTORNO');
    const envStatus = {
        CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
        CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'No configurado',
        TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: !!process.env.TELEGRAM_CHAT_ID,
        MCP_PORT: process.env.MCP_PORT || '4136',
        DATABASE_URL: !!process.env.DATABASE_URL,
        GITHUB_TOKEN: !!(process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN)
    };

    console.log(`  CLAUDE_API_KEY: ${envStatus.CLAUDE_API_KEY ? '✅' : '❌'}`);
    console.log(`  CLAUDE_MODEL: ${envStatus.CLAUDE_MODEL}`);
    console.log(`  TELEGRAM_BOT_TOKEN: ${envStatus.TELEGRAM_BOT_TOKEN ? '✅' : '❌'}`);
    console.log(`  TELEGRAM_CHAT_ID: ${envStatus.TELEGRAM_CHAT_ID ? '✅' : '❌'}`);
    console.log(`  MCP_PORT: ${envStatus.MCP_PORT}`);
    console.log(`  DATABASE_URL: ${envStatus.DATABASE_URL ? '✅' : '❌'}`);
    console.log(`  GITHUB_TOKEN: ${envStatus.GITHUB_TOKEN ? '✅' : '❌'}`);

    // 2. Verificar conexión con MCP
    console.log('\n2️⃣ CONEXIÓN CON MCP');
    let mcpRunner: McpRunner | null = null;
    try {
        mcpRunner = new McpRunner(parseInt(envStatus.MCP_PORT));
        const connected = await mcpRunner.testConnection();
        console.log(`  Conexión MCP: ${connected ? '✅' : '❌'}`);

        if (connected) {
            // Verificar herramientas disponibles
            console.log('\n  MCP MCPs DISPONIBLES:');
            console.log(`  - escanear-proyecto: ${'✅'}`);
            console.log(`  - listar-directorio: ${'✅'}`);
            console.log(`  - leer-archivo: ${'✅'}`);
            console.log(`  - escribir-archivo: ${'✅'}`);
            console.log(`  - ejecutar-comando: ${'✅'}`);
            console.log(`  - gestionar-feature: ${'✅'}`);
            console.log(`  - configurar-github: ${'✅'}`);
            console.log(`  - commit-push: ${'✅'}`);
        }
    } catch (error) {
        console.log(`  Error conectando con MCP: ${error}`);
    }

    // 3. Verificar conexión con Claude API
    console.log('\n3️⃣ API DE CLAUDE');
    if (envStatus.CLAUDE_API_KEY) {
        try {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: envStatus.CLAUDE_MODEL,
                    max_tokens: 50,
                    messages: [{ role: 'user', content: 'Say "Hello, I am working correctly"' }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01',
                        'x-api-key': process.env.CLAUDE_API_KEY
                    },
                    timeout: 10000
                }
            );
            console.log(`  API de Claude: ✅`);
        } catch (error: any) {
            console.log(`  API de Claude: ❌`);
            console.log(`  Error: ${error.message || error}`);
        }
    } else {
        console.log(`  API de Claude: ❌ (API Key no configurada)`);
    }

    // 4. Verificar estructura del proyecto
    console.log('\n4️⃣ ESTRUCTURA DEL PROYECTO');
    try {
        if (mcpRunner) {
            const codeExists = await fs.pathExists(path.resolve(process.cwd(), '../code'));
            console.log(`  Directorio code/: ${codeExists ? '✅' : '❌'}`);

            if (codeExists) {
                const mpcExists = await fs.pathExists(path.resolve(process.cwd(), '../mcp'));
                console.log(`  Directorio mcp/: ${mpcExists ? '✅' : '❌'}`);

                // Verificar estructura dentro de code/ si existe
                const structure = await mcpRunner.runTool('listar-directorio', { ruta: 'code' });
                console.log(`\n  Estructura básica de code/:`);
                console.log(`  ${structure.replace(/\n/g, '\n  ').slice(0, 300)}...`);
            }
        }
    } catch (error) {
        console.log(`  Error verificando estructura: ${error}`);
    }

    // 5. Verificar plan de desarrollo
    console.log('\n5️⃣ PLAN DE DESARROLLO');
    const planPath = path.resolve(__dirname, '../context/development_plan.yaml');
    const planExists = await fs.pathExists(planPath);
    console.log(`  Plan de desarrollo: ${planExists ? '✅' : '❌'}`);

    if (planExists) {
        try {
            const planStats = await fs.stat(planPath);
            const modified = new Date(planStats.mtime).toLocaleString();
            console.log(`  Última modificación: ${modified}`);
        } catch (error) {
            console.log(`  Error leyendo plan: ${error}`);
        }
    }

    // 6. Verificar estado del orquestador
    console.log('\n6️⃣ ESTADO DEL ORQUESTADOR');
    const statePath = path.resolve(__dirname, './orchestrator_state.json');
    const stateExists = await fs.pathExists(statePath);
    console.log(`  Archivo de estado: ${stateExists ? '✅' : '❌'}`);

    if (stateExists) {
        try {
            const stateContent = await fs.readFile(statePath, 'utf-8');
            const state = JSON.parse(stateContent);
            console.log(`  Features completadas: ${state.completedFeatures?.length || 0}`);
            console.log(`  Tareas completadas: ${state.completedTasks?.length || 0}`);
            console.log(`  Tarea actual: ${state.currentFeatureId}:${state.currentTaskId || 'ninguna'}`);
            console.log(`  Última actualización: ${new Date(state.lastUpdateTime).toLocaleString()}`);
        } catch (error) {
            console.log(`  Error leyendo estado: ${error}`);
        }
    }

    console.log('\n✨ VERIFICACIÓN COMPLETADA\n');
}

// Ejecutar verificación
checkSystem().catch(console.error);