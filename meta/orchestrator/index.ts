import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import { schedule } from 'node-cron';
import { McpRunner } from './mcp-runner';
import { ClaudeClient } from './claude-client';
import { StateManager } from './state-manager';
import { logger } from './logger';
import { Feature, Task, DevelopmentPlan } from './types';
import { ProjectPlanner } from './planner';
import { setupEnvironment } from './fix-env';

// Configurar variables de entorno con nuestra función mejorada
setupEnvironment();

// Cargar configuración
const CONFIG = {
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    claudeModel: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
    gpt4oUrl: process.env.BASE_GPT4o_URL || '',
    gpt4oApiKey: process.env.GPT4o_API_KEY || '',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    statusInterval: process.env.STATUS_INTERVAL || '30 * * * *', // Cada 30 minutos por defecto
    developmentPlanPath: path.resolve(__dirname, '../context/development_plan.yaml'),
    stateFilePath: path.resolve(__dirname, './orchestrator_state.json'),
    mcpPort: parseInt(process.env.MCP_PORT || '4000'),
    githubToken: process.env.GITHUB_TOKEN || process.env.GITHUB_APP_TOKEN || ''
};

// Descripción por defecto del proyecto cardiovascular
const DEFAULT_PROJECT_DESCRIPTION = `
# Sistema de Predicción de Riesgo Cardiovascular

El objetivo es desarrollar un sistema completo de predicción de riesgo cardiovascular, que consta de dos componentes principales:

1. **API REST con FastAPI**: Para exponer los servicios de predicción.
2. **Sistema de entrenamiento de modelos**: Para procesar datos y entrenar modelos predictivos.

## Requerimientos técnicos:

### Arquitectura limpia:
- Separación clara entre rutas, servicios, repositorios y esquemas
- Middlewares para manejo de errores y logging
- Conexión a base de datos PostgreSQL

### API FastAPI:
- Endpoint para recibir datos de pacientes
- Endpoint para predicción de riesgo cardiovascular
- Validación de datos mediante Pydantic
- Documentación automática con Swagger

### Entrenamiento de modelos:
- Pipeline ETL para procesamiento de datos
- Selección de características relevantes
- Entrenamiento de diferentes modelos (RandomForest, XGBoost, etc.)
- Evaluación y comparación de modelos
- Serialización de modelos para su uso en la API

### Otros requerimientos:
- Pruebas unitarias y de integración
- Documentación de código
- Variables de entorno para configuración
- Posibilidad de visualizar resultados
`;

class Orchestrator {
    private mcpRunner: McpRunner;
    private claudeClient: ClaudeClient;
    private planner: ProjectPlanner;
    private stateManager: StateManager;
    private telegramBot: TelegramBot | null = null;
    private developmentPlan: DevelopmentPlan;
    private isRunning: boolean = false;
    private isInitialized: boolean = false;

    constructor() {
        // Inicializar componentes
        this.mcpRunner = new McpRunner(CONFIG.mcpPort);
        this.claudeClient = new ClaudeClient(CONFIG.claudeApiKey, CONFIG.claudeModel);
        this.stateManager = new StateManager(CONFIG.stateFilePath);
        this.planner = new ProjectPlanner(this.claudeClient, this.mcpRunner, CONFIG.developmentPlanPath);
        this.developmentPlan = { features: [] };

        // Configurar bot de Telegram si hay credenciales
        if (CONFIG.telegramToken && CONFIG.telegramChatId) {
            try {
                this.telegramBot = new TelegramBot(CONFIG.telegramToken, { polling: true });
                this.setupTelegramCommands();
                logger.info('Bot de Telegram configurado correctamente');
            } catch (error: any) {
                logger.error('Error configurando bot de Telegram:', error);
                this.telegramBot = null;
            }
        } else {
            logger.warn('No se configuró Telegram. Las notificaciones solo se registrarán en logs.');
        }
    }

    /**
     * Configura comandos y escucha de mensajes para el bot de Telegram
     */
    private setupTelegramCommands(): void {
        if (!this.telegramBot || !CONFIG.telegramChatId) return;

        // Comando /start
        this.telegramBot.onText(/\/start/, async (msg) => {
            if (msg.chat.id.toString() !== CONFIG.telegramChatId) return;

            await this.telegramBot?.sendMessage(
                msg.chat.id,
                '🤖 *Orquestador de Desarrollo Cardiovascular*\n\n' +
                'Bot para monitoreo y control del desarrollo autónomo.\n\n' +
                'Comandos disponibles:\n' +
                '/status - Ver estado actual\n' +
                '/next - Ejecutar siguiente ciclo\n' +
                '/plan - Ver plan de desarrollo\n' +
                '/initialize - Reiniciar el orquestador',
                { parse_mode: 'Markdown' }
            );
        });

        // Comando /status
        this.telegramBot.onText(/\/status/, async (msg) => {
            if (msg.chat.id.toString() !== CONFIG.telegramChatId) return;

            const state = this.stateManager.getState();
            const completedFeatures = state.completedFeatures.length;
            const totalFeatures = this.developmentPlan.features.length;
            const progress = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

            let message = `📊 *Estado del Desarrollo*\n\n`;
            message += `Progreso: ${progress}% (${completedFeatures}/${totalFeatures})\n`;

            if (state.currentFeatureId) {
                const feature = this.developmentPlan.features.find(f => f.id === state.currentFeatureId);
                if (feature) {
                    message += `\n🔄 Tarea actual: ${feature.nombre}\n`;

                    if (state.currentTaskId) {
                        const task = feature.tasks?.find(t => t.id === state.currentTaskId);
                        if (task) {
                            message += `└─ ${task.desc}\n`;
                        }
                    }
                }
            }

            message += `\n🔄 Últimas actividades:\n`;
            const recentActivities = state.activities.slice(-5).reverse();
            for (const activity of recentActivities) {
                const date = new Date(activity.timestamp).toLocaleString().split(',')[0];
                message += `└─ ${date}: ${activity.description}\n`;
            }

            await this.telegramBot?.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
        });

        // Comando /next
        this.telegramBot.onText(/\/next/, async (msg) => {
            if (msg.chat.id.toString() !== CONFIG.telegramChatId) return;

            await this.telegramBot?.sendMessage(
                msg.chat.id,
                '🔄 Iniciando ciclo de desarrollo...',
                { parse_mode: 'Markdown' }
            );

            // Ejecutar ciclo
            if (this.isInitialized) {
                this.executeDevelopmentCycle();
            } else {
                await this.telegramBot?.sendMessage(
                    msg.chat.id,
                    '❌ El orquestador no está inicializado. Usa /initialize primero.',
                    { parse_mode: 'Markdown' }
                );
            }
        });

        // Comando /plan
        this.telegramBot.onText(/\/plan/, async (msg) => {
            if (msg.chat.id.toString() !== CONFIG.telegramChatId) return;

            let message = `📋 *Plan de Desarrollo*\n\n`;

            if (this.developmentPlan.features.length === 0) {
                message += "No hay plan de desarrollo cargado.";
            } else {
                for (const feature of this.developmentPlan.features) {
                    const completed = this.stateManager.getState().completedFeatures.includes(feature.id);
                    const emoji = completed ? "✅" : "⏳";

                    message += `${emoji} *${feature.nombre}*\n`;

                    if (feature.tasks && feature.tasks.length > 0) {
                        for (const task of feature.tasks) {
                            const taskKey = `${feature.id}:${task.id}`;
                            const taskCompleted = this.stateManager.getState().completedTasks.includes(taskKey);
                            const taskEmoji = taskCompleted ? "✅" : "⏳";

                            message += `└─ ${taskEmoji} ${task.desc}\n`;
                        }
                    }

                    message += "\n";
                }
            }

            // Si el mensaje es muy largo, dividirlo
            if (message.length > 4000) {
                const chunks = [];
                for (let i = 0; i < message.length; i += 4000) {
                    chunks.push(message.slice(i, i + 4000));
                }

                for (const chunk of chunks) {
                    await this.telegramBot?.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' });
                }
            } else {
                await this.telegramBot?.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
            }
        });

        // Comando /initialize
        this.telegramBot.onText(/\/initialize/, async (msg) => {
            if (msg.chat.id.toString() !== CONFIG.telegramChatId) return;

            await this.telegramBot?.sendMessage(
                msg.chat.id,
                '🔄 Reiniciando orquestador...',
                { parse_mode: 'Markdown' }
            );

            // Reiniciar
            this.isInitialized = false;
            const success = await this.initialize();

            if (success) {
                await this.telegramBot?.sendMessage(
                    msg.chat.id,
                    '✅ Orquestador inicializado correctamente.',
                    { parse_mode: 'Markdown' }
                );
            } else {
                await this.telegramBot?.sendMessage(
                    msg.chat.id,
                    '❌ Error inicializando orquestador. Revisa los logs.',
                    { parse_mode: 'Markdown' }
                );
            }
        });
    }

    /**
     * Inicializa el orquestador
     */
    async initialize(): Promise<boolean> {
        try {
            logger.info('Inicializando orquestador...');

            // Verificar API key de Claude
            if (!CONFIG.claudeApiKey) {
                logger.error('No se encontró API KEY de Claude. Configura CLAUDE_API_KEY en variables de entorno.');
                return false;
            }

            // Verificar conexión con MCP
            if (!await this.mcpRunner.testConnection()) {
                logger.error('No se pudo conectar con el MCP. Verifica que esté en ejecución.');
                return false;
            }

            // Cargar estado previo
            this.stateManager.loadState();

            // Cargar o generar plan de desarrollo
            this.developmentPlan = await this.planner.loadOrGeneratePlan(DEFAULT_PROJECT_DESCRIPTION);
            logger.info(`Plan de desarrollo cargado con ${this.developmentPlan.features.length} funcionalidades`);

            // Iniciar monitoreo
            this.setupCronJobs();

            // Notificar inicio
            await this.notify('🚀 Orquestador Iniciado', 'El sistema de desarrollo autónomo ha iniciado correctamente.');

            this.isInitialized = true;
            return true;
        } catch (error: any) {
            logger.error('Error inicializando orquestador:', error);
            return false;
        }
    }

    /**
     * Configura trabajos programados
     */
    private setupCronJobs(): void {
        // Programar envío de reporte de estado
        schedule(CONFIG.statusInterval, () => {
            if (this.isInitialized) {
                this.sendStatusReport();
            }
        });

        // Programar ejecución del ciclo cada hora (si no está ya ejecutándose)
        schedule('0 * * * *', () => {
            if (this.isInitialized && !this.isRunning) {
                this.executeDevelopmentCycle();
            } else if (this.isRunning) {
                logger.info('Ya hay un ciclo en ejecución. Omitiendo.');
            }
        });

        logger.info('Trabajos programados configurados');
    }

    /**
     * Envía un reporte de estado
     */
    async sendStatusReport(): Promise<void> {
        try {
            const state = this.stateManager.getState();
            const completedFeatures = state.completedFeatures.length;
            const totalFeatures = this.developmentPlan.features.length;
            const progress = Math.round((completedFeatures / totalFeatures) * 100);

            let report = `📊 *Reporte de Progreso*\n\n`;
            report += `Progreso general: ${progress}%\n`;
            report += `Funcionalidades completadas: ${completedFeatures}/${totalFeatures}\n\n`;

            if (state.currentFeatureId) {
                const feature = this.developmentPlan.features.find(f => f.id === state.currentFeatureId);
                if (feature) {
                    report += `🔄 Trabajando en: *${feature.nombre}*\n`;

                    if (state.currentTaskId) {
                        const task = feature.tasks?.find(t => t.id === state.currentTaskId);
                        if (task) {
                            report += `📝 Tarea actual: ${task.desc}\n`;
                        }
                    }
                }
            }

            report += `\n🔄 Últimas actividades:\n`;
            const recentActivities = state.activities.slice(-5).reverse();
            for (const activity of recentActivities) {
                const date = new Date(activity.timestamp).toLocaleString();
                report += `- ${date}: ${activity.description}\n`;
            }

            await this.notify('Reporte de Progreso', report);
        } catch (error: any) {
            logger.error('Error enviando reporte de estado:', error);
        }
    }

    /**
     * Envía una notificación por Telegram
     */
    private async notify(title: string, message: string, isError = false): Promise<void> {
        // Registrar en logs
        if (isError) {
            logger.error(`${title}: ${message}`);
        } else {
            logger.info(`${title}: ${message}`);
        }

        // Enviar por Telegram si está configurado
        if (this.telegramBot && CONFIG.telegramChatId) {
            try {
                const formattedMessage = `*${title}*\n\n${message}`;
                await this.telegramBot.sendMessage(CONFIG.telegramChatId, formattedMessage, {
                    parse_mode: 'Markdown'
                });
            } catch (error: any) {
                logger.error('Error enviando notificación a Telegram:', error);
            }
        }
    }

    /**
     * Ejecuta un ciclo completo de desarrollo
     */
    async executeDevelopmentCycle(): Promise<void> {
        if (!this.isInitialized) {
            logger.error('El orquestador no está inicializado. No se puede ejecutar el ciclo.');
            return;
        }

        if (this.isRunning) {
            logger.info('Ya hay un ciclo en ejecución. Omitiendo.');
            return;
        }

        this.isRunning = true;
        try {
            logger.info('Iniciando ciclo de desarrollo...');
            await this.notify('🔄 Ciclo Iniciado', 'Iniciando nuevo ciclo de desarrollo');

            // Obtener próxima funcionalidad
            const nextFeature = this.getNextFeature();
            if (!nextFeature) {
                await this.notify('✅ Desarrollo Completado', 'Todas las funcionalidades han sido implementadas.');
                this.isRunning = false;
                return;
            }

            // Obtener próxima tarea
            const nextTask = this.getNextTask(nextFeature);
            if (!nextTask) {
                // Marcar funcionalidad como completada y reintentar ciclo
                this.stateManager.markFeatureCompleted(nextFeature.id);
                await this.notify('✅ Funcionalidad Completada', `La funcionalidad "${nextFeature.nombre}" ha sido completada.`);
                this.isRunning = false;
                await this.executeDevelopmentCycle();
                return;
            }

            // Procesar tarea
            await this.processTask(nextFeature, nextTask);
        } catch (error: any) {
            logger.error('Error en ciclo de desarrollo:', error);
            await this.notify('❌ Error en Ciclo', `Se produjo un error: ${error}`, true);
        }
        this.isRunning = false;
    }

    /**
     * Obtiene la siguiente funcionalidad a implementar
     */
    private getNextFeature(): Feature | null {
        const state = this.stateManager.getState();

        // Buscar primero por dependencias satisfechas
        for (const feature of this.developmentPlan.features) {
            // Omitir features completadas
            if (state.completedFeatures.includes(feature.id)) {
                continue;
            }

            // Verificar dependencias
            const dependencies = feature.dependencies || [];
            const allDependenciesMet = dependencies.every(dep =>
                state.completedFeatures.includes(dep)
            );

            if (allDependenciesMet) {
                return feature;
            }
        }

        // Si no hay con dependencias satisfechas, buscar la primera sin dependencias
        for (const feature of this.developmentPlan.features) {
            if (!state.completedFeatures.includes(feature.id) &&
                (!feature.dependencies || feature.dependencies.length === 0)) {
                return feature;
            }
        }

        return null;
    }

    /**
     * Obtiene la siguiente tarea a implementar
     */
    private getNextTask(feature: Feature): Task | null {
        const state = this.stateManager.getState();

        // Buscar primera tarea no completada
        for (const task of feature.tasks || []) {
            const taskKey = `${feature.id}:${task.id}`;
            if (!state.completedTasks.includes(taskKey)) {
                return task;
            }
        }

        return null;
    }

    /**
     * Procesa una tarea específica
     */
    private async processTask(feature: Feature, task: Task): Promise<void> {
        try {
            logger.info(`Procesando tarea ${task.id} de funcionalidad ${feature.id}`);
            this.stateManager.setCurrentTask(feature.id, task.id);

            // Notificar inicio
            await this.notify('🛠️ Iniciando Tarea',
                `Iniciando trabajo en la tarea "${task.desc}" de la funcionalidad "${feature.nombre}"`);

            // 1. Generar prompt para Claude
            const prompt = await this.generatePromptForTask(feature, task);

            // 2. Obtener solución de Claude
            logger.info('Solicitando solución a Claude...');
            const solution = await this.claudeClient.askClaude(prompt);

            // 3. Implementar solución
            logger.info('Implementando solución...');
            const implementationSuccess = await this.implementSolution(solution, feature, task);

            if (!implementationSuccess) {
                throw new Error(`No se pudo implementar la solución para la tarea ${task.id}`);
            }

            // 4. Verificar implementación con pruebas
            logger.info('Ejecutando pruebas...');
            const testsPassed = await this.runTests(feature, task);

            if (!testsPassed) {
                // Intentar corregir problemas
                logger.info('Las pruebas fallaron. Intentando corregir...');

                const correctionPrompt = await this.generateCorrectionPrompt(feature, task);
                const correction = await this.claudeClient.askClaude(correctionPrompt);

                // Implementar corrección
                const correctionSuccess = await this.implementSolution(correction, feature, task);

                if (!correctionSuccess) {
                    throw new Error(`No se pudo implementar la corrección para la tarea ${task.id}`);
                }

                // Verificar nuevamente
                const retestPassed = await this.runTests(feature, task);

                if (!retestPassed) {
                    throw new Error(`Las pruebas siguen fallando después de la corrección para la tarea ${task.id}`);
                }
            }

            // 5. Marcar tarea como completada
            this.stateManager.markTaskCompleted(feature.id, task.id);

            // 6. Actualizar progreso de la funcionalidad
            await this.updateFeatureProgress(feature);

            // 7. Guardar cambios en GitHub
            await this.commitChanges(feature, task);

            // 8. Notificar éxito
            await this.notify('✅ Tarea Completada',
                `La tarea "${task.desc}" de la funcionalidad "${feature.nombre}" ha sido completada exitosamente.`);

            // Continuar con la siguiente tarea si hay tiempo
            this.isRunning = false;
            await this.executeDevelopmentCycle();

        } catch (error: any) {
            logger.error(`Error procesando tarea ${task.id}:`, error);
            await this.notify('❌ Error en Tarea',
                `Error en la tarea "${task.desc}": ${error.message}`, true);
            this.isRunning = false;
        }
    }

    /**
     * Genera un prompt para Claude para implementar una tarea
     */
    private async generatePromptForTask(feature: Feature, task: Task): Promise<string> {
        try {
            // Obtener estructura del proyecto
            const projectStructure = await this.mcpRunner.runTool('listar-directorio', {
                ruta: 'code',
                recursivo: true
            });

            // Prompt básico
            let prompt = `# Tarea de Desarrollo: ${task.desc}

## Contexto
Estás trabajando en el proyecto de predicción cardiovascular, específicamente en la 
funcionalidad: **${feature.nombre}** (ID: ${feature.id}).

La tarea actual es: **${task.desc}** (ID: ${task.id})

## Estructura Actual del Proyecto
\`\`\`
${projectStructure}
\`\`\`

## Detalles de la Tarea
${task.details || 'No hay detalles adicionales para esta tarea.'}

## Instrucciones
1. Analiza la estructura actual del proyecto
2. Determina qué archivos necesitas crear o modificar para completar esta tarea
3. Genera el código necesario
4. Proporciona el código completo para cada archivo, usando bloques de código con triple backtick
5. Indica claramente la ruta de cada archivo que debe crearse o modificarse

Es importante que tu respuesta incluya bloques de código claramente delimitados y rutas de archivo precisas para que pueda implementar tu solución correctamente.
`;

            // Si hay un comando de prueba, incluirlo
            if (task.test_command) {
                prompt += `\n## Prueba de Verificación
Tu implementación debe pasar la siguiente prueba:
\`\`\`
${task.test_command}
\`\`\`
`;
            }

            return prompt;
        } catch (error: any) {
            logger.error('Error generando prompt para Claude:', error);
            throw error;
        }
    }

    /**
     * Genera un prompt para corregir problemas en una implementación
     */
    private async generateCorrectionPrompt(feature: Feature, task: Task): Promise<string> {
        try {
            // Obtener estructura del proyecto
            const projectStructure = await this.mcpRunner.runTool('listar-directorio', {
                ruta: 'code',
                recursivo: true
            });

            let prompt = `# Corrección de Implementación

Las pruebas para la tarea "${task.desc}" de la funcionalidad "${feature.nombre}" han fallado.
Por favor, revisa y corrige la implementación.

## Detalles de la Tarea
${task.details || 'No hay detalles adicionales para esta tarea.'}

## Estructura Actual del Proyecto
\`\`\`
${projectStructure}
\`\`\`

## Comando de Prueba
\`\`\`
${task.test_command || 'No hay comando de prueba específico.'}
\`\`\`

Por favor, proporciona una versión corregida del código con las rutas exactas de los archivos.
Asegúrate de incluir el código completo para cada archivo que necesite modificación.
`;

            return prompt;
        } catch (error: any) {
            logger.error('Error generando prompt de corrección:', error);
            throw error;
        }
    }

    /**
     * Implementa una solución propuesta por Claude
     */
    private async implementSolution(solution: string, feature: Feature, task: Task): Promise<boolean> {
        try {
            logger.info(`Implementando solución para ${feature.id}:${task.id}`);

            // Buscar secciones de código en la respuesta
            const fileContentRegex = /```([a-z]+)\s*\n([\s\S]*?)\n```/g;
            const filePathRegex = /([a-zA-Z0-9_\/.-]+\.[a-z]+):/g;

            // Extraer caminos de archivos mencionados
            const filePaths: string[] = [];
            let match;
            while ((match = filePathRegex.exec(solution)) !== null) {
                filePaths.push(match[1]);
            }

            // Extraer contenidos de archivos de bloques de código
            const fileContents: { lang: string, content: string }[] = [];
            let contentMatch;
            while ((contentMatch = fileContentRegex.exec(solution)) !== null) {
                fileContents.push({
                    lang: contentMatch[1],
                    content: contentMatch[2]
                });
            }

            // Si no hay contenidos de archivos, retornar error
            if (fileContents.length === 0) {
                logger.error('No se encontraron secciones de código en la respuesta de Claude');
                return false;
            }

            // Implementar cada archivo
            for (let i = 0; i < fileContents.length; i++) {
                const { content } = fileContents[i];

                // Buscar referencia a ruta dentro del contenido
                const pathInContentMatch = content.match(/\/\/\s*([a-zA-Z0-9_\/.-]+\.[a-z]+)/);

                let filePath = '';

                // Si solo hay una ruta y un contenido, usar esa ruta
                if (filePaths.length === 1 && fileContents.length === 1) {
                    filePath = filePaths[0];
                }
                // Si hay una ruta en el comentario, usarla
                else if (pathInContentMatch) {
                    filePath = pathInContentMatch[1];
                }
                // Sino, usar la ruta i-ésima si existe
                else if (i < filePaths.length) {
                    filePath = filePaths[i];
                }
                // Si no hay rutas, generar un nombre temporal
                else {
                    const extension = fileContents[i].lang === 'python' ? '.py' :
                        fileContents[i].lang === 'javascript' ? '.js' :
                            fileContents[i].lang === 'typescript' ? '.ts' : '.txt';
                    filePath = `code/api/generated_${Date.now()}${extension}`;
                }

                // Asegurar que la ruta comience con code/
                if (!filePath.startsWith('code/')) {
                    filePath = `code/${filePath}`;
                }

                // Verificar si el archivo ya existe
                let fileExists = false;
                try {
                    const existingContent = await this.mcpRunner.runTool('leer-archivo', { ruta: filePath });
                    fileExists = existingContent.length > 0;
                } catch (error: any) {
                    fileExists = false;
                }

                // Escribir o modificar archivo
                const result = await this.mcpRunner.runTool('escribir-archivo', {
                    ruta: filePath,
                    contenido: content,
                    descripcion: `${fileExists ? 'Modificado' : 'Creado'} para tarea ${task.id}`
                });

                if (!result) {
                    logger.error(`Error escribiendo archivo ${filePath}`);
                    return false;
                }

                logger.info(`${fileExists ? 'Modificado' : 'Creado'} archivo ${filePath}`);
            }

            // Escanear proyecto para actualizar árbol
            await this.mcpRunner.runTool('escanear-proyecto', { directorio: 'code' });

            return true;
        } catch (error: any) {
            logger.error('Error implementando solución:', error);
            return false;
        }
    }

    /**
     * Ejecuta pruebas para verificar una implementación
     */
    private async runTests(feature: Feature, task: Task): Promise<boolean> {
        try {
            // Si hay un comando de prueba específico, ejecutarlo
            if (task.test_command) {
                logger.info(`Ejecutando prueba específica para tarea ${task.id}: ${task.test_command}`);

                const testResult = await this.mcpRunner.runTool('ejecutar-comando', {
                    comando: task.test_command,
                    directorio: 'code'
                });

                // Verificar si la prueba pasó
                return testResult.includes('PASSED') || !testResult.includes('FAILED');
            }

            // Si no hay prueba específica, ejecutar todas las pruebas
            logger.info('Ejecutando todas las pruebas');

            const testResult = await this.mcpRunner.runTool('ejecutar-comando', {
                comando: 'python -m pytest',
                directorio: 'code'
            });

            return !testResult.includes('FAILED');
        } catch (error: any) {
            logger.error('Error ejecutando pruebas:', error);
            return false;
        }
    }

    /**
     * Actualiza el progreso de una funcionalidad
     */
    private async updateFeatureProgress(feature: Feature): Promise<void> {
        try {
            const state = this.stateManager.getState();

            // Contar tareas completadas
            const totalTasks = (feature.tasks || []).length;
            if (totalTasks === 0) return;

            let completedTasks = 0;
            for (const task of (feature.tasks || [])) {
                const taskKey = `${feature.id}:${task.id}`;
                if (state.completedTasks.includes(taskKey)) {
                    completedTasks++;
                }
            }

            // Calcular progreso
            const progress = Math.round((completedTasks / totalTasks) * 100);

            // Actualizar feature en MCP
            await this.mcpRunner.runTool('gestionar-feature', {
                id: feature.id,
                nombre: feature.nombre,
                descripcion: feature.descripcion || '',
                progreso: progress
            });

            logger.info(`Progreso de funcionalidad ${feature.id} actualizado a ${progress}%`);

            // Si todas las tareas están completadas, marcar funcionalidad como completada
            if (completedTasks === totalTasks) {
                this.stateManager.markFeatureCompleted(feature.id);
                await this.notify('✅ Funcionalidad Completada',
                    `La funcionalidad "${feature.nombre}" ha sido completada al 100%.`);
            }
        } catch (error: any) {
            logger.error('Error actualizando progreso de funcionalidad:', error);
        }
    }

    /**
     * Guarda cambios en GitHub
     */
    private async commitChanges(feature: Feature, task: Task): Promise<void> {
        try {
            logger.info(`Guardando cambios en GitHub para tarea ${task.id}`);

            // Preparar mensaje de commit
            const commitMessage = `Completa tarea ${task.id}: ${task.desc}`;

            // Ejecutar commit
            const result = await this.mcpRunner.runTool('commit-push', {
                mensaje: commitMessage
            });

            if (result) {
                logger.info('Cambios guardados en GitHub exitosamente');
            } else {
                logger.warn('No se pudieron guardar cambios en GitHub');
            }
        } catch (error: any) {
            logger.error('Error guardando cambios en GitHub:', error);
        }
    }

    /**
     * Inicia el orquestador y ejecuta el primer ciclo
     */
    async start(): Promise<void> {
        const initialized = await this.initialize();
        if (initialized) {
            // Ejecutar primer ciclo inmediatamente
            await this.executeDevelopmentCycle();
        } else {
            logger.error('No se pudo inicializar el orquestador. Verifica la configuración y los logs.');
        }
    }
}

// Ejecutar orquestador al importar el módulo
const orchestrator = new Orchestrator();
orchestrator.start().catch(error => {
    logger.error('Error iniciando orquestador:', error);
});