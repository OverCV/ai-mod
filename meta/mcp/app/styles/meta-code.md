# Framework MCP-CODE

Este framework busca...

## Estructura Fundamental

El proyecto se divide en dos directorios principales:

```
proyecto/
├── code/       # Implementación del problema en el lenguaje apropiado
└── meta/mcp/   # Tooling, configuración y gestión del proyecto
```

### Directorio `code/`

Contiene la implementación concreta del problema, organizada según el paradigma y tecnologías más adecuadas:

- Para ML/AI: Estructura basada en Python (módulos, clases, pipelines)
- Para desarrollo web: React/NextJS o similar
- Para backend: FastAPI, Django, Express, etc.

Elementos críticos dentro de `code/`:

- `context/`: Árboles de directorio y metadatos del proyecto
  - Habrán árboles con directorios de `code/**` únicamente
  - Árbol ASCII para visión rápida (`code/context/tree_ascii.txt`)
    - Árboles en JSON para análisis de la estructura (`code/context/tree_project.json`)

    *acá está el problema que podría resolverse con el RAG*

- `tracking/`: Seguimiento del progreso de features y estado global
  - `features/`: Archivos YAML detallando cada funcionalidad
  - `database.md`: Esquema de base de datos (debe sincronizarse vía MCP)
  - `status.yaml`: Progreso global del proyecto e indicadores

- `tests/`: **Todos** los tests deben residir aquí, organizados por componente/feature
  - Facilita la ejecución automatizada y reportes de cobertura
  - Asegura que cualquier desarrollador sepa dónde buscar/añadir tests

- `README.md`: Documentación detallada del proyecto
  - Instrucciones precisas de ejecución (desde qué directorio, comandos)
  - Configuración necesaria para desarrollo/producción
  - Descripción de componentes principales y su interacción

Así mismo según se defina el proyecto habrán sub-directorios adicionales como `code/src/`, `code/app/` o similar.

### Directorio `meta/mcp/`

Centro de operaciones para la gestión del proyecto:

- `context/`: Árboles de directorio y metadatos del proyecto
  - Habrán árboles con directorios de `meta/mcp/**` únicamente
  - Árbol ASCII para visión rápida (`meta/mcp/context/tree_ascii.txt`)
  - Árboles detallados en JSON para análisis profundo (`meta/mcp/context/tree_project.json`)

- `tools/`: Herramientas personalizadas para el proyecto
  - Scripts de automatización
  - Herramientas de análisis
  - Configuración específica

- `issues/`: Registro de problemas encontrados durante el desarrollo
  - Documentación clara: entrada/salida esperada/real
  - Análisis de la causa raíz
  - Recomendaciones para evitar recurrencia

Acá todo código de implementación concreto será en TypeScript.

## Flujo de Trabajo

### Inicio del Proyecto

1. Ejecución de `mcdp` con parámetros de configuración inicial
   - Complementa con el estilo predefinido desarrollo del LLM (Experto | Senior | Arquitecto)
   - Revisa el árbol JSON de `code/context/` si hay, si no hace un escaneo del directorio `code/tracking/features/` para ver qué hay definido.
     - En caso que no haya nada definido, pregunta al usuario si desea crear un nuevo árbol de directorios y archivos para el proyecto.
       - Define arquitectura base del proyecto
       - Establece convenciones de código y estructura
     - Tras primero definir con el usuario las features se pasa con la creación de un arbol ascii *(pues surge de comprender el objetivo del proyecto y poder crear nodos significativos)*

2. Implementación de arquitectura base siguiendo principios SOLID
   - Clean Architecture / Screaming Architecture
   - Estructura modular y testable
   - Documentación clara de decisiones arquitectónicas

El desarrollo debe buscar siempre ser incremental, lograr algo muy pequeño y funcional, probarlo y seguir creciendo.
El lenguaje de desarrollo claro es lo que ya se haya pre-definido pero fundamentalmente es según el objetivo, sean modelos e ia Python, para web/frontend React/NextJS etc.

### Ciclo de Desarrollo

1. **Definición de Features**
   - Creación de archivos YAML en `code/tracking/features/`
   - Desglose en tareas específicas con estados (pendiente, progreso, completado). Una tarea no se cancela, cambia de ser necesario.
   - Asignación de pruebas unitarias e integración
   - Las rutas son ubicaciones relativas de los archivos a mutar en el proceso de forma que se tenga su enlace rápido.

2. **Implementación**
   - Desarrollo siguiendo la estructura definida
   - Creación de tests en `code/tests/` (si aplica y según lenguaje)
   - Actualización del árbol del proyecto periódicamente

3. **Pruebas**
   - Ejecución de tests para verificar funcionalidad
   - Notificación cuando todos los tests de una feature pasan
   - Documentación de problemas en `mcp/issues/` cuando sea necesario

4. **Actualización de Tracking**
   - Actualización del progreso en archivos YAML
   - Sincronización del esquema de base de datos si aplica
   - Actualización del status global del proyecto

## Recomendaciones de Mejora

### Automatización Adicional

1. **Script de Verificación**
   - Herramienta que compruebe automáticamente que los tests están en el directorio correcto
   - Validación de estructura de archivos YAML de features

2. **Workflow de Integración**
   - Hook pre-commit que actualice automáticamente los árboles
   - Validación de que los cambios respetan la arquitectura definida

3. **Dashboard de Progreso**
   - Visualización gráfica del progreso basada en `code/tracking/status.yaml`
   - Integración con herramientas de CI/CD

### Extensiones MCP

1. **mcp-sync-db**
   - Sincronización bidireccional entre código y esquema DB
   - Generación automática de migraciones

2. **mcp-test-coverage**
   - Análisis de cobertura de tests por feature
   - Recomendaciones para áreas con baja cobertura

3. **mcp-doc-generator**
   - Generación automática de documentación a partir del código
   - Actualización del README con cambios significativos

## Conclusión

Este marco de trabajo proporciona:

1. **Estructura clara y consistente** para cualquier tipo de proyecto
2. **Trazabilidad** de features y progreso
3. **Organización eficiente** de código, tests y documentación
4. **Automatización** de tareas repetitivas
5. **Gestión efectiva** de problemas y soluciones

La separación entre `code/` y `meta/mcp/` permite una clara distinción entre la implementación del problema y la infraestructura de gestión, facilitando el desarrollo colaborativo y la evolución del proyecto a lo largo del tiempo. Así mismo es importante que revises el directorio en el que estás trabajando ya que es usual que al no mirarlo creas estás haciendo algo en `meta/mcp/` y lo estás haciendo en `code/` o viceversa.