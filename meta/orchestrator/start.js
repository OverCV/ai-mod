#!/usr/bin/env node

// Script para ejecutar el orquestador sin necesidad de compilación
const { execSync } = require('child_process');
const path = require('path');

// Carpeta actual
const currentDir = __dirname;

console.log('🚀 Iniciando Orquestador Cardiovascular...');

try {
    // Ejecutar directamente con ts-node (evita problemas de compilación)
    execSync('npx ts-node index.ts', {
        cwd: currentDir,
        stdio: 'inherit'
    });
} catch (error) {
    console.error('❌ Error iniciando orquestador:', error.message);
}