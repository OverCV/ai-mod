import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ClaudeClient } from './claude-client';
import { McpRunner } from './mcp-runner';
import { logger } from './logger';
import { DevelopmentPlan, Feature } from './types';

export class ProjectPlanner {
    private claudeClient: ClaudeClient;
    private mcpRunner: McpRunner;
    private planPath: string;

    constructor(
        claudeClient: ClaudeClient,
        mcpRunner: McpRunner,
        planPath: string = path.resolve(__dirname, '../context/development_plan.yaml')
    ) {
        this.claudeClient = claudeClient;
        this.mcpRunner = mcpRunner;
        this.planPath = planPath;
    }

    /**
     * Genera un plan de desarrollo basado en una descripción de proyecto
     */
    async generatePlan(projectDescription: string): Promise<DevelopmentPlan> {
        try {
            logger.info('Generando plan de desarrollo basado en la descripción del proyecto');

            // Obtener estructura actual del proyecto (si existe)
            let projectStructure = '';
            try {
                projectStructure = await this.mcpRunner.runTool('listar-directorio', {
                    ruta: 'code',
                    recursivo: true
                });
            } catch (error) {
                logger.warn('No se pudo obtener la estructura actual del proyecto. Puede ser un proyecto nuevo.');
                projectStructure = "El proyecto parece ser nuevo, no hay estructura existente.";
            }

            // Generar prompt para Claude
            const prompt = `# Generación de Plan de Desarrollo

## Descripción del Proyecto
${projectDescription}

## Estructura Actual (si existe)
\`\`\`
${projectStructure}
\`\`\`

## Tarea
Genera un plan de desarrollo estructurado para este proyecto. El plan debe seguir estas pautas:

1. Organiza el desarrollo en funcionalidades (features) incrementales
2. Cada funcionalidad debe tener tareas específicas y atómicas 
3. Establece dependencias entre funcionalidades cuando sea necesario
4. Incluye comandos de prueba para verificar cada tarea

Proporciona el plan en formato YAML con esta estructura:

\`\`\`yaml
features:
  - id: feature-id
    nombre: "Nombre descriptivo de la funcionalidad"
    descripcion: "Descripción detallada"
    dependencies: [] # IDs de otras features de las que depende
    tasks:
      - id: task-id
        desc: "Descripción corta de la tarea"
        details: |
          Detalles técnicos y requerimientos específicos
          multilinea si es necesario
        test_command: "comando para verificar la implementación"
\`\`\`

Asegúrate de que:
- Las IDs sean cortas pero descriptivas
- Las tareas sean atómicas (una sola responsabilidad)
- El orden de las funcionalidades refleje una dependencia lógica
- Los comandos de prueba sean específicos y verifiquen la implementación

Incluye funcionalidades para:
- Configuración inicial y estructura de directorios
- Modelos de datos y esquemas
- Endpoints de API
- Lógica de negocio
- Pruebas y documentación
`;

            // Obtener plan generado por Claude
            const response = await this.claudeClient.askClaude(prompt);

            // Extraer YAML del texto de respuesta
            const yamlMatch = response.match(/```yaml\s*([\s\S]*?)\s*```/);
            if (!yamlMatch || !yamlMatch[1]) {
                throw new Error('No se pudo extraer el plan YAML de la respuesta');
            }

            const yamlPlan = yamlMatch[1];

            // Parsear YAML
            const plan = yaml.load(yamlPlan) as DevelopmentPlan;

            // Validar plan
            if (!plan || !plan.features || !Array.isArray(plan.features)) {
                throw new Error('El plan generado no tiene el formato esperado');
            }

            logger.info(`Plan generado con ${plan.features.length} funcionalidades`);

            // Guardar plan en archivo
            await fs.ensureDir(path.dirname(this.planPath));
            await fs.writeFile(this.planPath, yamlPlan);

            return plan;
        } catch (error) {
            logger.error('Error generando plan de desarrollo:', error);
            throw error;
        }
    }

    /**
     * Carga un plan existente o genera uno nuevo si no existe
     */
    async loadOrGeneratePlan(fallbackDescription: string): Promise<DevelopmentPlan> {
        try {
            // Verificar si existe plan previo
            if (await fs.pathExists(this.planPath)) {
                logger.info(`Cargando plan existente desde ${this.planPath}`);
                const content = await fs.readFile(this.planPath, 'utf-8');
                return yaml.load(content) as DevelopmentPlan;
            }

            // Si no existe, generar nuevo plan
            logger.info('No se encontró plan existente. Generando uno nuevo...');
            return this.generatePlan(fallbackDescription);
        } catch (error) {
            logger.error('Error cargando o generando plan:', error);
            throw error;
        }
    }

    /**
     * Actualiza una funcionalidad específica en el plan
     */
    async updateFeature(featureId: string, updatedFeature: Feature): Promise<void> {
        try {
            // Cargar plan actual
            if (!await fs.pathExists(this.planPath)) {
                throw new Error('No existe el archivo de plan');
            }

            const content = await fs.readFile(this.planPath, 'utf-8');
            const plan = yaml.load(content) as DevelopmentPlan;

            // Buscar y actualizar la funcionalidad
            const featureIndex = plan.features.findIndex(f => f.id === featureId);
            if (featureIndex === -1) {
                throw new Error(`No se encontró la funcionalidad con ID ${featureId}`);
            }

            plan.features[featureIndex] = updatedFeature;

            // Guardar plan actualizado
            await fs.writeFile(this.planPath, yaml.dump(plan));

            logger.info(`Funcionalidad ${featureId} actualizada en el plan`);
        } catch (error) {
            logger.error(`Error actualizando funcionalidad ${featureId}:`, error);
            throw error;
        }
    }
}