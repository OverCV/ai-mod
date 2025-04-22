Al momento de modificar archivos vía [mcp] para que no se borren! Hay un MCP?

Otro detalle importante es que la conversación se va haciendo más larga y eso puede causar problemas, como que se pierda el estilo quizás?

falta que se despliegue y pueda ser probado, digamos el frontend y backend por ejemplo, al menos inicialmente sólo back pero será ir integrando para hacer lo mismo por demás módulos.
Eso desencadena en que tocaría hacerse que el orquestador se multiplique? Porque pues sería uno que se encargue de un back, otro del front, un orquestador por cada servicio. Con ello necesitaría un orquestador de orquestadores, que primero que nada defina la arquitectura global? Orquestador arquitecto?

Asi mismo estas issues se podrían controlar desde github?

así mismo me parece que varios LLM pueden ser partícipes del mismo proceso, de forma que haya un supervisor, validador, acá se solapa con la idea de Lucho de un sistema multi-agente, donde hay roles.

Para las integraciones, habrán momentos en los que por ejemplo para usar un servicio de mensajería el orquestador debería obtener una API Key con mi cuenta o similar. A lo mejor acá se debería tener un MCP de Playwright?

!!Actualizar los contextos porque las rutas cambiaron (sólo yo puedo hacerlo, subjetivo)

Hay problemas de lógica porque por ejemplo el crear archivos va, pero, digamos el crear directorios y más cosas al final termina usando más el `ejecutar-comando` lo cual pues no tiene mucho sentido cuando se sobreexplota su uso en vez de usar los MCP.
    - Deberían haber como reglas para usar los endpoints, estas indican cuál sería el mejor MCP a usar según la acción pedida por el usuario.


El problema de no repetir código existente es con el RAG, de forma que pueda eficientemente responderse a la pregunta de si existe y dónde. Así mismo entonces? Podría hacerse un documento de seguimiento (tipo:: [fecha][mcp~usado][ruta-alterada]: Se implementó el archivo que permite la conexión a la base de datos postgresql.) El problema que imagino surge de ello es el coste computacional de todo el tiempo estar actualizando dicho documento? Si es que no se implementa correctamente y sobre~escribe lo que hay.

Implementar RAG vía neo4J sobre el árbol para actualización asu¿ybcrioono
