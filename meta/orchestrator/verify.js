/**
 * Script para verificar el entorno y solucionar problemas comunes
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Colores para la consola
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m"
};

console.log(`\n${colors.bold}${colors.cyan}=== VERIFICADOR DEL ENTORNO CARDIOVASCULAR ===${colors.reset}\n`);

async function main() {
    // 1. Verificar archivos necesarios
    checkFiles();

    // 2. Verificar variables de entorno
    checkEnv();

    // 3. Verificar dependencias
    await checkDependencies();

    // 4. Verificar MCP
    await checkMCP();

    // 5. Verificar Telegram
    await checkTelegram();

    // 6. Mostrar instrucciones de ejecución
    showInstructions();
}

function checkFiles() {
    console.log(`${colors.bold}1. Verificando archivos necesarios${colors.reset}`);

    const requiredFiles = [
        'index.ts',
        'mcp-runner.ts',
        'claude-client.ts',
        'state-manager.ts',
        'logger.ts',
        'fix-env.ts',
        'planner.ts',
        'types.ts',
        'package.json',
        'tsconfig.json',
        'start.js'
    ];

    let allFilesExist = true;

    for (const file of requiredFiles) {
        const exists = fs.existsSync(path.join(__dirname, file));
        console.log(`   ${exists ? colors.green + '✓' : colors.red + '✗'} ${file}${colors.reset}`);

        if (!exists) {
            allFilesExist = false;
        }
    }

    if (!allFilesExist) {
        console.log(`   ${colors.yellow}⚠️ Faltan algunos archivos. Verifica que todos están en el directorio.${colors.reset}`);
    } else {
        console.log(`   ${colors.green}✓ Todos los archivos necesarios están presentes.${colors.reset}`);
    }

    console.log('');
}

function checkEnv() {
    console.log(`${colors.bold}2. Verificando variables de entorno${colors.reset}`);

    // Buscar archivo .env en diferentes ubicaciones
    const possiblePaths = [
        path.join(__dirname, '../../.env'),
        path.join(__dirname, '../.env'),
        path.join(__dirname, './.env')
    ];

    let envFile = null;
    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            envFile = envPath;
            break;
        }
    }

    if (!envFile) {
        console.log(`   ${colors.red}✗ No se encontró archivo .env${colors.reset}`);
        return;
    }

    console.log(`   ${colors.green}✓ Archivo .env encontrado en: ${envFile}${colors.reset}`);

    // Leer contenido
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envLines = envContent.split('\n');

    const requiredVars = [
        'CLAUDE_API_KEY',
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHAT_ID',
        'DATABASE_URL',
        'GITHUB_TOKEN',
        'MCP_PORT'
    ];

    for (const varName of requiredVars) {
        const hasVar = envLines.some((line) =>
            line.trim().startsWith(varName + '=') && line.trim().length > varName.length + 1
        );

        console.log(`   ${hasVar ? colors.green + '✓' : colors.yellow + '⚠️'} ${varName}${colors.reset}`);
    }

    console.log('');
}

async function checkDependencies() {
    console.log(`${colors.bold}3. Verificando dependencias${colors.reset}`);

    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
        console.log(`   ${colors.yellow}⚠️ Carpeta node_modules no encontrada. Instalando dependencias...${colors.reset}`);

        try {
            execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
            console.log(`   ${colors.green}✓ Dependencias instaladas correctamente${colors.reset}`);
        } catch (error) {
            console.log(`   ${colors.red}✗ Error instalando dependencias: ${error.message}${colors.reset}`);
        }
    } else {
        console.log(`   ${colors.green}✓ Dependencias ya instaladas${colors.reset}`);
    }

    console.log('');
}

async function checkMCP() {
    console.log(`${colors.bold}4. Verificando MCP${colors.reset}`);

    // Verificar puerto MCP
    const mcpPort = 4000; // Por defecto

    console.log(`   Intentando conectar al MCP en puerto ${mcpPort}...`);

    try {
        await axios.get(`http://localhost:${mcpPort}`, {
            timeout: 3000,
            validateStatus: () => true
        });
        console.log(`   ${colors.green}✓ MCP respondiendo en puerto ${mcpPort}${colors.reset}`);
    } catch (error) {
        console.log(`   ${colors.yellow}⚠️ No se pudo conectar directamente al MCP en puerto ${mcpPort}${colors.reset}`);

        // Verificar si está corriendo en algún proceso
        try {
            const isWindows = process.platform === 'win32';
            const command = isWindows
                ? 'tasklist | findstr "tsx node" || echo "No running"'
                : 'ps aux | grep "tsx\\|node" | grep -v grep || echo "No running"';

            const output = execSync(command, { encoding: 'utf8' });

            if (output.includes('tsx') || (output.includes('node') && !output.includes('No running'))) {
                console.log(`   ${colors.green}✓ Procesos Node/TSX detectados, posible MCP en ejecución${colors.reset}`);

                // Mostrar procesos encontrados
                console.log(`   ${colors.cyan}Procesos encontrados:${colors.reset}`);
                output.split('\n').forEach((line) => {
                    if (line.trim() && !line.includes('No running') && !line.includes('verify.js')) {
                        console.log(`     ${line.trim().substring(0, 80)}...`);
                    }
                });
            } else {
                console.log(`   ${colors.yellow}⚠️ No se detectaron procesos del MCP${colors.reset}`);

                // Sugerir iniciar MCP
                console.log(`   ${colors.cyan}Sugerencia: Inicia el MCP manualmente con:${colors.reset}`);
                console.log(`     npx -y tsx mcp/app/main.ts (desde el directorio raíz del proyecto)`);
            }
        } catch (processError) {
            console.log(`   ${colors.red}✗ Error verificando procesos: ${processError.message}${colors.reset}`);
        }
    }

    console.log('');
}

async function checkTelegram() {
    console.log(`${colors.bold}5. Verificando configuración de Telegram${colors.reset}`);

    // Leer variables desde el archivo .env
    const envFile = path.join(__dirname, '../../.env');
    if (!fs.existsSync(envFile)) {
        console.log(`   ${colors.yellow}⚠️ No se pudo encontrar archivo .env para verificar Telegram${colors.reset}`);
        return;
    }

    const envContent = fs.readFileSync(envFile, 'utf8');
    const tokenMatch = envContent.match(/TELEGRAM_BOT_TOKEN=([^\s]+)/);
    const chatIdMatch = envContent.match(/TELEGRAM_CHAT_ID=([^\s]+)/);

    if (!tokenMatch || !chatIdMatch) {
        console.log(`   ${colors.yellow}⚠️ No se encontraron credenciales de Telegram en .env${colors.reset}`);
        return;
    }

    const token = tokenMatch[1];
    const chatId = chatIdMatch[1];

    console.log(`   ${colors.green}✓ Credenciales de Telegram encontradas${colors.reset}`);

    // Verificar API key de telegram
    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 5000 });

        if (response.data && response.data.ok) {
            console.log(`   ${colors.green}✓ Bot de Telegram validado: @${response.data.result.username}${colors.reset}`);
        } else {
            console.log(`   ${colors.red}✗ Error validando bot de Telegram${colors.reset}`);
        }
    } catch (error) {
        console.log(`   ${colors.red}✗ Error validando bot de Telegram: ${error.message}${colors.reset}`);
    }

    console.log('');
}

function showInstructions() {
    console.log(`${colors.bold}${colors.cyan}=== INSTRUCCIONES DE EJECUCIÓN ===${colors.reset}\n`);

    console.log(`1. ${colors.bold}Iniciar el MCP${colors.reset} (si no está en ejecución):`);
    console.log(`   ${colors.cyan}cd ../${colors.reset}`);
    console.log(`   ${colors.cyan}npx -y tsx mcp/app/main.ts${colors.reset}\n`);

    console.log(`2. ${colors.bold}Iniciar el orquestador${colors.reset}:`);
    console.log(`   ${colors.cyan}npm start${colors.reset} (ejecuta start.js que usa ts-node)\n`);

    console.log(`3. ${colors.bold}Verificar estado${colors.reset}:`);
    console.log(`   ${colors.cyan}npm run check${colors.reset} (ejecuta check-system.ts)\n`);

    console.log(`4. ${colors.bold}Comandos en Telegram${colors.reset}:`);
    console.log(`   ${colors.cyan}/start${colors.reset} - Muestra comandos disponibles`);
    console.log(`   ${colors.cyan}/status${colors.reset} - Muestra estado actual`);
    console.log(`   ${colors.cyan}/next${colors.reset} - Ejecuta siguiente ciclo`);
    console.log(`   ${colors.cyan}/plan${colors.reset} - Muestra plan de desarrollo`);
    console.log(`   ${colors.cyan}/initialize${colors.reset} - Reinicia el orquestador\n`);

    console.log(`${colors.bold}${colors.green}¡Verificación completada!${colors.reset}\n`);
}

// Ejecutar verificación
main().catch(error => {
    console.error(`${colors.red}Error durante la verificación:${colors.reset}`, error);
});