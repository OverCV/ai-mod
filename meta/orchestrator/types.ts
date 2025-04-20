/**
 * Tarea dentro de una funcionalidad
 */
export interface Task {
    id: string;
    desc: string;
    details?: string;
    test_command?: string;
}

/**
 * Funcionalidad del proyecto
 */
export interface Feature {
    id: string;
    nombre: string;
    descripcion?: string;
    dependencies?: string[];
    tasks?: Task[];
}

/**
 * Plan de desarrollo
 */
export interface DevelopmentPlan {
    features: Feature[];
}

/**
 * Actividad del orquestador
 */
export interface Activity {
    timestamp: string;
    type: 'feature' | 'task' | 'system';
    description: string;
}