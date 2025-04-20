#!/usr/bin/env node

/**
 * Script para probar la API de Claude directamente
 * Ejecutar con: node test-claude-api.js
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colores para la consola
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

// Cargar variables de entorno
function loadEnv() {
    const possiblePaths = [
        path.join(__dirname, '../../.env'),
        path.join(__dirname, '../.env'),
        path.join(__dirname, './.env')
    ];

    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            console.log(`${colors.blue}Cargando variables de entorno desde: ${envPath}${colors.reset}`);
            require('dotenv').config({ path: envPath });
            return envPath;
        }
    }

    console.log(`${colors.red}No se encontró archivo .env${colors.reset}`);
    return null;
}

// Buscar clave API en el entorno o archivo .env
async function findApiKey() {
    const envPath = loadEnv();

    if (!envPath) {
        return null;
    }

    // Verificar si existe en variables de entorno
    if (process.env.CLAUDE_API_KEY) {
        console.log(`${colors.green}✓ CLAUDE_API_KEY encontrada en variables de entorno${colors.reset}`);
        const keyStart = process.env.CLAUDE_API_KEY.substring(0, 10);
        console.log(`  Comienza con: ${keyStart}...`);
        return process.env.CLAUDE_API_KEY.trim();
    }

    // Intentar extraer directamente del archivo .env
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/CLAUDE_API_KEY=([^\n]+)/);

        if (match && match[1]) {
            const apiKey = match[1].trim();
            console.log(`${colors.green}✓ CLAUDE_API_KEY encontrada en archivo .env${colors.reset}`);
            const keyStart = apiKey.substring(0, 10);
            console.log(`  Comienza con: ${keyStart}...`);
            return apiKey;
        }
    } catch (err) {
        console.error(`${colors.red}Error leyendo archivo .env: ${err.message}${colors.reset}`);
    }

    console.log(`${colors.red}✗ No se encontró CLAUDE_API_KEY${colors.reset}`);
    return null;
}

// Probar la API de Claude
async function testClaudeApi() {
    console.log(`\n${colors.bold}=== PRUEBA DE API DE CLAUDE ===${colors.reset}\n`);

    const apiKey = await findApiKey();

    if (!apiKey) {
        console.log(`${colors.red}No se pudo encontrar la API Key de Claude. Abortando prueba.${colors.reset}`);
        return;
    }

    console.log(`\n${colors.blue}Enviando solicitud de prueba a Claude...${colors.reset}`);

    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: "claude-3-opus-20240229",
                max_tokens: 100,
                messages: [
                    {
                        role: "user",
                        content: "Respond with only the words 'API Connection Successful' if you receive this message"
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': apiKey
                },
                timeout: 30000
            }
        );

        if (response.data && response.data.content && response.data.content.length > 0) {
            const text = response.data.content[0].text;
            console.log(`\n${colors.green}✓ Respuesta recibida de Claude:${colors.reset}`);
            console.log(`  "${text}"`);

            // Mostrar modelo
            console.log(`\n${colors.blue}Detalles de la respuesta:${colors.reset}`);
            console.log(`  Modelo utilizado: ${response.data.model}`);

            // Verificar éxito
            if (text.includes("API Connection Successful")) {
                console.log(`\n${colors.green}${colors.bold}✓ PRUEBA EXITOSA: API DE CLAUDE FUNCIONA CORRECTAMENTE${colors.reset}`);
            } else {
                console.log(`\n${colors.yellow}⚠️ PRUEBA PARCIAL: API conectada pero respuesta inesperada${colors.reset}`);
            }

            // Guardar API Key verificada en un archivo local
            fs.writeFileSync('.claude_key_verified', apiKey);
            console.log(`\n${colors.blue}La API Key verificada se ha guardado localmente para el orquestador${colors.reset}`);
        } else {
            console.log(`\n${colors.red}✗ Respuesta inválida o vacía${colors.reset}`);
        }
    } catch (error) {
        console.log(`\n${colors.red}✗ Error conectando con API de Claude:${colors.reset}`);

        if (error.response) {
            console.log(`  Código de error: ${error.response.status}`);
            console.log(`  Mensaje: ${JSON.stringify(error.response.data)}`);

            // Mostrar sugerencias según el código de error
            if (error.response.status === 401) {
                console.log(`\n${colors.yellow}Problema detectado: API Key inválida o expirada${colors.reset}`);
                console.log(`  - Verifica que la API Key sea correcta y esté activa`);
                console.log(`  - Asegúrate que no tenga espacios o caracteres especiales adicionales`);
            } else if (error.response.status === 400) {
                console.log(`\n${colors.yellow}Problema detectado: Solicitud malformada${colors.reset}`);
                console.log(`  - Revisa el formato de la API Key`);
                console.log(`  - Verifica que no haya caracteres especiales o espacios en la API Key`);

                // Mostrar API Key ofuscada para detectar problemas
                console.log(`\n${colors.blue}Información para depuración:${colors.reset}`);
                console.log(`  API Key ofuscada: ${maskApiKey(apiKey)}`);
                console.log(`  Longitud: ${apiKey.length} caracteres`);
            } else if (error.response.status === 429) {
                console.log(`\n${colors.yellow}Problema detectado: Límite de cuota excedido${colors.reset}`);
                console.log(`  - Has superado el límite de solicitudes permitidas`);
                console.log(`  - Espera un tiempo antes de intentar nuevamente`);
            }
        } else if (error.request) {
            console.log(`  Error de red: No se recibió respuesta`);
        } else {
            console.log(`  Error: ${error.message}`);
        }
    }

    // Ofrecer instrucciones para el siguiente paso
    console.log(`\n${colors.bold}=== PRÓXIMOS PASOS ===${colors.reset}`);
    console.log(`
1. Si la prueba fue exitosa, puedes iniciar el orquestador:
   ${colors.blue}npm start${colors.reset}

2. Si la prueba falló, verifica tu API Key en el archivo .env:
   ${colors.blue}- Debe comenzar con "sk-ant-api..."${colors.reset}
   ${colors.blue}- No debe tener espacios o saltos de línea${colors.reset}

3. Si la API Key es correcta pero hay otros errores:
   ${colors.blue}node start.js --mock-claude${colors.reset} (modo simulación sin API)
`);
}

// Función auxiliar para enmascarar la API Key
function maskApiKey(apiKey) {
    if (!apiKey) return '';

    if (apiKey.length <= 16) {
        return '****' + apiKey.substring(apiKey.length - 4);
    }

    return apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
}

// Ejecutar prueba
testClaudeApi().catch(err => {
    console.error(`${colors.red}Error en prueba: ${err.message}${colors.reset}`);
});