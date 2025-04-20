/**
 * Script para mostrar estado actual del orquestador
 * Ejecutar con: npm run status
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import { StateManager } from './state-manager';
import { DevelopmentPlan, Feature } from './types';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Cargar configuración
const CONFIG = {
    stateFilePath: path.resolve(__dirname, './orchestrator_state.json'),
    developmentPlanPath: path.resolve(__dirname, '../context/development_plan.yaml')
};

async function showStatus() {
    console.log('\n📊 ESTADO DEL DESARROLLO CARDIOVASCULAR 📊\n');

    // Cargar estado
    const stateManager = new StateManager(CONFIG.stateFilePath);
    stateManager.loadState();
    const state = stateManager.getState();

    // Cargar plan de desarrollo
    let plan: DevelopmentPlan = { features: [] };
    try {
        if (await fs.pathExists(CONFIG.developmentPlanPath)) {
            const planContent = await fs.readFile(CONFIG.developmentPlanPath, 'utf-8');
            plan = yaml.load(planContent) as DevelopmentPlan;
        }
    } catch (error) {
        console.error('Error cargando plan de desarrollo:', error);
    }

    // Mostrar progreso general
    const completedFeatures = state.completedFeatures.length;
    const totalFeatures = plan.features.length;
    const progress = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    console.log(`Progreso General: ${progress}% (${completedFeatures}/${totalFeatures} funcionalidades)\n`);

    // Mostrar tarea actual
    if (state.currentFeatureId) {
        const currentFeature = plan.features.find(f => f.id === state.currentFeatureId);
        if (currentFeature) {
            console.log(`🔄 Trabajando en: ${currentFeature.nombre} (${state.currentFeatureId})`);

            if (state.currentTaskId) {
                const currentTask = currentFeature.tasks?.find(t => t.id === state.currentTaskId);
                if (currentTask) {
                    console.log(`📝 Tarea actual: ${currentTask.desc} (${state.currentTaskId})`);
                }
            }
            console.log();
        }
    }

    // Mostrar funcionalidades y su estado
    console.log('ESTADO DE FUNCIONALIDADES:\n');

    for (const feature of plan.features) {
        const isCompleted = state.completedFeatures.includes(feature.id);
        const isInProgress = state.currentFeatureId === feature.id;

        const statusSymbol = isCompleted ? '✅' : isInProgress ? '🔄' : '⏳';

        console.log(`${statusSymbol} ${feature.nombre} (${feature.id})`);

        // Mostrar estado de tareas
        if (feature.tasks && feature.tasks.length > 0) {
            for (const task of feature.tasks) {
                const taskKey = `${feature.id}:${task.id}`;
                const isTaskCompleted = state.completedTasks.includes(taskKey);
                const isTaskInProgress = isInProgress && state.currentTaskId === task.id;

                const taskSymbol = isTaskCompleted ? '✅' : isTaskInProgress ? '🔄' : '⏳';
                console.log(`  ${taskSymbol} ${task.desc} (${task.id})`);
            }
        }

        console.log();
    }

    // Mostrar actividades recientes
    console.log('ACTIVIDADES RECIENTES:\n');

    const recentActivities = state.activities.slice(-10).reverse();
    for (const activity of recentActivities) {
        const date = new Date(activity.timestamp).toLocaleString();
        console.log(`[${date}] ${activity.description}`);
    }
}

// Ejecutar
showStatus().catch(console.error);