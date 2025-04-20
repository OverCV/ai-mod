import * as fs from 'fs-extra';
import { logger } from './logger';

/**
 * Estado del orquestador
 */
export interface OrchestratorState {
    // Estado actual
    currentFeatureId: string | null;
    currentTaskId: string | null;

    // Progreso
    completedFeatures: string[];
    completedTasks: string[];
    progress: number;

    // Historial
    activities: {
        timestamp: string;
        type: 'feature' | 'task' | 'system';
        description: string;
    }[];

    // Metadata
    lastUpdateTime: string;
}

/**
 * Gestiona el estado del orquestador
 */
export class StateManager {
    private statePath: string;
    private state: OrchestratorState;

    constructor(statePath: string) {
        this.statePath = statePath;
        this.state = this.getInitialState();
    }

    /**
     * Crea un estado inicial
     */
    private getInitialState(): OrchestratorState {
        return {
            currentFeatureId: null,
            currentTaskId: null,
            completedFeatures: [],
            completedTasks: [],
            progress: 0,
            activities: [],
            lastUpdateTime: new Date().toISOString()
        };
    }

    /**
     * Carga el estado desde el archivo
     */
    loadState(): void {
        try {
            if (fs.existsSync(this.statePath)) {
                const data = fs.readFileSync(this.statePath, 'utf-8');
                this.state = JSON.parse(data);
                logger.info(`Estado cargado: ${this.completedFeatures.length} features y ${this.completedTasks.length} tareas completadas`);
            } else {
                this.state = this.getInitialState();
                logger.info('No se encontró archivo de estado. Creando estado inicial.');
                this.saveState();
            }
        } catch (error) {
            logger.error('Error cargando estado:', error);
            this.state = this.getInitialState();
            this.saveState();
        }
    }

    /**
     * Guarda el estado en el archivo
     */
    saveState(): void {
        try {
            this.state.lastUpdateTime = new Date().toISOString();
            fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
        } catch (error) {
            logger.error('Error guardando estado:', error);
        }
    }

    /**
     * Obtiene el estado actual
     */
    getState(): OrchestratorState {
        return this.state;
    }

    /**
     * Establece la tarea actual
     */
    setCurrentTask(featureId: string, taskId: string): void {
        this.state.currentFeatureId = featureId;
        this.state.currentTaskId = taskId;

        this.logActivity('task', `Iniciando tarea ${taskId} de funcionalidad ${featureId}`);
        this.saveState();
    }

    /**
     * Marca una tarea como completada
     */
    markTaskCompleted(featureId: string, taskId: string): void {
        const taskKey = `${featureId}:${taskId}`;

        if (!this.state.completedTasks.includes(taskKey)) {
            this.state.completedTasks.push(taskKey);
            this.logActivity('task', `Completada tarea ${taskId} de funcionalidad ${featureId}`);
            this.saveState();
        }
    }

    /**
     * Marca una funcionalidad como completada
     */
    markFeatureCompleted(featureId: string): void {
        if (!this.state.completedFeatures.includes(featureId)) {
            this.state.completedFeatures.push(featureId);
            this.logActivity('feature', `Completada funcionalidad ${featureId}`);
            this.saveState();
        }
    }

    /**
     * Registra una actividad
     */
    logActivity(type: 'feature' | 'task' | 'system', description: string): void {
        this.state.activities.push({
            timestamp: new Date().toISOString(),
            type,
            description
        });

        // Limitar a las últimas 100 actividades
        if (this.state.activities.length > 100) {
            this.state.activities = this.state.activities.slice(-100);
        }

        logger.info(`[${type.toUpperCase()}] ${description}`);
    }

    /**
     * Getters para propiedades principales
     */
    get currentFeatureId(): string | null {
        return this.state.currentFeatureId;
    }

    get currentTaskId(): string | null {
        return this.state.currentTaskId;
    }

    get completedFeatures(): string[] {
        return this.state.completedFeatures;
    }

    get completedTasks(): string[] {
        return this.state.completedTasks;
    }

    get activities(): any[] {
        return this.state.activities;
    }
}