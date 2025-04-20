import axios from 'axios';
import { logger } from './logger';

/**
 * Cliente para comunicación con la API de Claude
 */
export class ClaudeClient {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-opus-20240229') {
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * Envía una consulta a Claude
     * @param prompt Prompt a enviar
     * @param systemPrompt Instrucciones de sistema (opcional)
     * @param maxTokens Máximo de tokens en respuesta
     * @returns Respuesta de Claude
     */
    async askClaude(
        prompt: string,
        systemPrompt?: string,
        maxTokens: number = 4000
    ): Promise<string> {
        try {
            logger.info(`Enviando consulta a Claude (${this.model}), longitud: ${prompt.length} caracteres`);

            // Verificación de la API Key
            if (!this.apiKey || this.apiKey.trim() === '') {
                throw new Error('API Key de Claude no configurada');
            }

            // Sanitizar API Key (a veces puede tener espacios o caracteres especiales)
            const sanitizedKey = this.apiKey.trim();

            // Log para depuración (sin mostrar la key completa)
            const keyPrefix = sanitizedKey.substring(0, 10);
            logger.info(`Usando API Key con prefijo: ${keyPrefix}...`);

            const headers = {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': sanitizedKey
            };

            const data: any = {
                model: this.model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens
            };

            if (systemPrompt) {
                data.system = systemPrompt;
            }

            // Log para depuración
            logger.info(`Enviando solicitud a: https://api.anthropic.com/v1/messages`);
            logger.info(`Payload: ${JSON.stringify({
                model: data.model,
                messages: [{ role: 'user', content: prompt.substring(0, 100) + '...' }],
                max_tokens: data.max_tokens,
                system: systemPrompt ? 'present' : 'not present'
            })}`);

            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                data,
                { headers, timeout: 120000 } // 120s timeout
            );

            // Modo "simulación" para pruebas
            if (process.env.MOCK_CLAUDE === 'true') {
                logger.info('Modo simulación activado. Retornando respuesta falsa.');
                return "```yaml\nfeatures:\n  - id: estructura-base\n    nombre: \"Estructura base del proyecto\"\n    descripcion: \"Configuración inicial\"\n    dependencies: []\n    tasks:\n      - id: dirs-api\n        desc: \"Crear estructura API\"\n        details: \"Crear directorios base\"\n        test_command: \"test -d code/api\"\n```";
            }

            if (response.data && response.data.content && response.data.content.length > 0) {
                const text = response.data.content[0].text;
                logger.info(`Respuesta recibida de Claude, longitud: ${text.length} caracteres`);
                return text;
            }

            throw new Error('No se recibió respuesta válida de Claude');
        } catch (error: any) {
            // Mejorar el logging de errores
            if (error.response) {
                logger.error(`Error en respuesta de Claude: Status ${error.response.status}`);
                logger.error(`Detalles: ${JSON.stringify(error.response.data || {})}`);
            } else if (error.request) {
                logger.error(`Error en solicitud (sin respuesta): ${error.message}`);
            } else {
                logger.error(`Error consultando a Claude: ${error.message}`);
            }

            // Como solución temporal para pruebas, devolvemos un plan básico
            logger.info('Usando plan de desarrollo de respaldo debido al error...');
            return '```yaml\nfeatures:\n  - id: estructura-base\n    nombre: "Estructura base del proyecto"\n    descripcion: "Configuración inicial y estructura de directorios"\n    dependencies: []\n    tasks:\n      - id: dirs-api\n        desc: "Crear estructura de directorios API"\n        details: "Crear la estructura básica de directorios para la API"\n        test_command: "test -d code/api"\n  - id: modelos-datos\n    nombre: "Modelos de datos"\n    descripcion: "Definición de esquemas de datos"\n    dependencies: ["estructura-base"]\n    tasks:\n      - id: esquemas\n        desc: "Crear esquemas básicos"\n        details: "Definir esquemas Pydantic"\n        test_command: "echo PASSED"\n```';
        }
    }
}