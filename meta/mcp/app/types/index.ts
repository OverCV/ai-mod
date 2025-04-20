// mcp\app\types\index.ts
// Lista de directorios a ignorar
export const IGNORE_DIRS = [
    'node_modules',
    'venv',
    '.venv/ ',
    '__pycache__',
    '.git',
    'dist',
    'build',
    '.mcp'
];


// Tipos para los nodos del árbol básico
export type BasicNode = {
    n: string;           // nombre
    t: 'dir' | 'file';   // tipo
    d?: string;          // descripción
    c?: BasicNode[];     // contenido (hijos)
}

// Tipos para elementos detallados
export type DetailedElement = {
    t: 'fn' | 'cls' | 'var';  // tipo: función, clase, variable
    n: string;                // nombre
    d?: string;               // descripción
    i?: string[];             // inputs (parámetros)
    o?: string;               // output (retorno)
}

// Tipos para los nodos del árbol detallado
export type DetailedNode = {
    n: string;                 // nombre
    t: 'dir' | 'file';         // tipo
    d?: string;                // descripción
    c?: DetailedNode[];        // contenido (hijos)
    e?: DetailedElement[];     // elementos (funciones, clases, etc)
}

// Tipo para los cambios registrados
export type ChangeLog = {
    fecha: string;
    archivo?: string;
    tipo: 'add' | 'mod' | 'del' | 'scan' | 'system';
    desc: string;
    accion?: string;
}

// Tipo para tareas en funcionalidades
export type Task = {
    id: string;
    desc: string;
    estado: 'pendiente' | 'en_progreso' | 'completado' | 'bloqueado';
    tags?: string[];
}

// Tipo para estado de pruebas
export type TestStatus = {
    unitarias: string;     // formato: "completadas/total"
    integracion?: string;  // formato: "completadas/total"
}

// Tipo para funcionalidades
export type Feature = {
    id: string;
    nombre: string;
    descripcion: string;
    progreso: number;      // 0-100
    tareas?: Task[];
    pruebas?: TestStatus;
}

// Tipo para configuración de GitHub
export type GitHubConfig = {
    token: string;         // Personal Access Token
    owner: string;         // Propietario del repositorio
    repo: string;          // Nombre del repositorio
    branch: string;        // Rama principal
}