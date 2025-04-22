import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { configureDatabase, executeQuery, getPool } from "../tools/database.js"
import { z } from "zod"
import path from "path"
import paths from "../config/paths.js"


/**
 * Registra herramientas para trabajar con bases de datos
 */
export function registerDatabaseMcp(server: McpServer) {

  // Herramienta para probar la conexión
  server.tool(
    'probar-conexion-db',
    "Prueba la conexión a la base de datos PostgreSQL. Verifica que la conexión funcione correctamente",
    {
      parameters: z.object({}),
    },
    async () => {
      try {
        const result = await executeQuery('SELECT version() as version')

        return {
          content: [
            {
              type: "text",
              text: `Conexión exitosa a PostgreSQL.\nVersión: ${result.data[0].version}`
            }
          ]
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error al probar conexión: ${error.message}`
            }
          ]
        }
      }
    }
  )

  // Herramienta para configurar la variable de entorno para BD
  server.tool(
    'configurar-database',
    "Configura el nombre de la variable de entorno para la conexión a la base de datos.",
    {
      parameters: z.object({
        envName: z.string().describe("Nombre de la variable de entorno (por defecto: DATABASE_URL)")
      }),
    },
    async ({ parameters }) => {
      try {
        const configPath = path.join(paths.metaMpcRoot, "database.json")
        const success = await configureDatabase(configPath, parameters.envName)

        if (success) {
          return {
            content: [
              {
                type: "text",
                text: `Configurado para usar la variable de entorno ${parameters.envName}. Asegúrate de que esta variable esté definida en el archivo .env`
              }
            ]
          }
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Error guardando la configuración de base de datos."
              }
            ]
          }
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error configurando base de datos: ${error.message}`
            }
          ]
        }
      }
    }
  )

  // Herramienta para listar tablas
  server.tool(
    'listar-tablas',
    "Lista todas las tablas en la base de datos. Obtiene los nombres de todas las tablas",
    {
      parameters: z.object({}),
    },
    async () => {
      try {
        const query = `
          SELECT 
              table_name,
              (SELECT count(*) FROM information_schema.columns WHERE table_name=t.table_name) as column_count,
              obj_description(pgc.oid, 'pg_class') as table_description
          FROM 
              information_schema.tables t
          JOIN
              pg_class pgc ON pgc.relname = t.table_name
          WHERE 
              table_schema = 'public'
          ORDER BY 
              table_name
        `

        const result = await executeQuery(query)

        if (result.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No se encontraron tablas en la base de datos."
              }
            ]
          }
        }

        let response = `Tablas encontradas: ${result.data.length}\n\n`
        response += "| Tabla | Columnas | Descripción |\n"
        response += "|-------|----------|-------------|\n"

        result.data.forEach(table => {
          response += `| ${table.table_name} | ${table.column_count} | ${table.table_description || '-'} |\n`
        })

        return {
          content: [
            {
              type: "text",
              text: response
            }
          ]
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error al listar tablas: ${error.message}`
            }
          ]
        }
      }
    }
  )

  // Herramienta para describir la estructura de una tabla
  server.tool(
    'describir-tabla',
    "Describe la estructura de una tabla. Obtiene información detallada de las columnas de una tabla",
    {
      parameters: z.object({
        nombre: z.string().describe("Nombre de la tabla a describir")
      }),
    },
    async ({ parameters }) => {
      try {
        const { nombre } = parameters

        // Verificar que la tabla exista
        const checkTableQuery = `
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        `

        const tableExists = await executeQuery(checkTableQuery, [nombre])
        if (tableExists.data[0].count === '0') {
          return {
            content: [
              {
                type: "text",
                text: `La tabla '${nombre}' no existe en la base de datos.`
              }
            ]
          }
        }

        // Consultar columnas
        const columnsQuery = `
          SELECT 
              column_name, 
              data_type, 
              character_maximum_length,
              is_nullable, 
              column_default,
              col_description(
                  (SELECT oid FROM pg_class WHERE relname = $1),
                  ordinal_position
              ) as column_description
          FROM 
              information_schema.columns 
          WHERE 
              table_schema = 'public' AND 
              table_name = $1
          ORDER BY 
              ordinal_position
        `

        // Consultar restricciones
        const constraintsQuery = `
          SELECT
              c.conname as constraint_name,
              c.contype as constraint_type,
              CASE
                  WHEN c.contype = 'p' THEN 'PRIMARY KEY'
                  WHEN c.contype = 'f' THEN 'FOREIGN KEY'
                  WHEN c.contype = 'u' THEN 'UNIQUE'
                  WHEN c.contype = 'c' THEN 'CHECK'
                  ELSE 'OTHER'
              END as constraint_description,
              array_to_string(array_agg(a.attname), ', ') as column_names
          FROM
              pg_constraint c
          JOIN
              pg_class t ON c.conrelid = t.oid
          JOIN
              pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
          WHERE
              t.relname = $1
          GROUP BY
              c.conname, c.contype
          ORDER BY
              c.contype
        `

        const [columnsResult, constraintsResult] = await Promise.all([
          executeQuery(columnsQuery, [nombre]),
          executeQuery(constraintsQuery, [nombre])
        ])

        if (columnsResult.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `La tabla '${nombre}' existe pero no tiene columnas.`
              }
            ]
          }
        }

        // Construir respuesta
        let response = `## Estructura de la tabla **${nombre}**\n\n`

        // Mostrar columnas
        response += "### Columnas\n\n"
        response += "| Columna | Tipo | Tamaño | Nullable | Default | Descripción |\n"
        response += "|---------|------|--------|----------|---------|-------------|\n"

        columnsResult.data.forEach(col => {
          const dataType = col.character_maximum_length
            ? `${col.data_type}(${col.character_maximum_length})`
            : col.data_type

          response += `| ${col.column_name} | ${dataType} | ${col.character_maximum_length || '-'} | ${col.is_nullable} | ${col.column_default || '-'} | ${col.column_description || '-'} |\n`
        })

        // Mostrar restricciones
        if (constraintsResult.data.length > 0) {
          response += "\n### Restricciones\n\n"
          response += "| Nombre | Tipo | Columnas |\n"
          response += "|--------|------|----------|\n"

          constraintsResult.data.forEach(constraint => {
            response += `| ${constraint.constraint_name} | ${constraint.constraint_description} | ${constraint.column_names} |\n`
          })
        }

        return {
          content: [
            {
              type: "text",
              text: response
            }
          ]
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error al describir tabla: ${error.message}`
            }
          ]
        }
      }
    }
  )

  // Herramienta para ejecutar consultas SELECT
  server.tool(
    'ejecutar-query',
    "Ejecuta una consulta SQL en PostgreSQL. Solo lectura",
    {
      parameters: z.object({
        query: z.string().describe("Consulta SQL a ejecutar (solo SELECT)"),
        params: z.array(z.any()).optional().describe("Parámetros para la consulta")
      }),
    },
    async ({ parameters }) => {
      try {
        const { query, params = [] } = parameters

        // Verificar que sea una consulta de solo lectura
        const cleanedQuery = query.trim().toLowerCase()
        if (!cleanedQuery.startsWith('select') && !cleanedQuery.startsWith('with')) {
          return {
            content: [
              {
                type: "text",
                text: "Por seguridad, solo se permiten consultas SELECT o consultas WITH que terminen en SELECT."
              }
            ]
          }
        }

        // Ejecutar dentro de una transacción de solo lectura
        const client = await getPool().connect()
        try {
          await client.query('BEGIN TRANSACTION READ ONLY')
          const result = await client.query(query, params)
          await client.query('COMMIT')

          if (result.rows.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "La consulta no devolvió resultados."
                }
              ]
            }
          }

          // Formatear como tabla si son pocos resultados
          if (result.rows.length <= 20) {
            // Obtener nombres de columnas
            const columns = result.fields.map(field => field.name)

            let response = `Resultados (${result.rows.length} filas):\n\n`
            response += "| " + columns.join(" | ") + " |\n"
            response += "|" + columns.map(() => "------").join("|") + "|\n"

            result.rows.forEach(row => {
              response += "| " + columns.map(col => String(row[col] !== null ? row[col] : 'NULL')).join(" | ") + " |\n"
            })

            return {
              content: [
                {
                  type: "text",
                  text: response
                }
              ]
            }
          } else {
            // Si son muchos resultados, mostrar como JSON
            return {
              content: [
                {
                  type: "text",
                  text: `Resultados (${result.rows.length} filas):\n\n\`\`\`json\n${JSON.stringify(result.rows, null, 2)}\n\`\`\``
                }
              ]
            }
          }
        } finally {
          await client.query('ROLLBACK').catch(() => { })
          client.release()
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error ejecutando consulta: ${error.message}`
            }
          ]
        }
      }
    }
  )

  // Herramienta para crear una tabla (esquema)
  server.tool(
    'crear-tabla',
    "Crea una nueva tabla en la base de datos. Crea una tabla según el esquema especificado",
    {
      parameters: z.object({
        nombre: z.string().describe("Nombre de la tabla a crear"),
        schema: z.string().describe("Definición SQL de la tabla (CREATE TABLE ...)"),
        descripcion: z.string().optional().describe("Descripción de la tabla para documentación")
      }),
    },
    async ({ parameters }) => {
      try {
        const { nombre, schema, descripcion } = parameters

        // Verificar que la tabla no exista
        const checkQuery = `
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        `

        const checkResult = await executeQuery(checkQuery, [nombre])

        if (parseInt(checkResult.data[0].count) > 0) {
          return {
            content: [
              {
                type: "text",
                text: `La tabla '${nombre}' ya existe en la base de datos. Usa 'ejecutar-query' si necesitas modificarla.`
              }
            ]
          }
        }

        // Ejecutar la creación de la tabla
        const client = await getPool().connect()
        try {
          await client.query('BEGIN')

          // Ejecutar el script de creación
          await client.query(schema)

          // Añadir comentario a la tabla si se proporciona descripción
          if (descripcion) {
            await client.query(`COMMENT ON TABLE ${nombre} IS $1`, [descripcion])
          }

          await client.query('COMMIT')

          return {
            content: [
              {
                type: "text",
                text: `Tabla '${nombre}' creada exitosamente.`
              }
            ]
          }
        } catch (error: any) {
          await client.query('ROLLBACK')
          return {
            content: [
              {
                type: "text",
                text: `Error creando tabla: ${error.message}`
              }
            ]
          }
        } finally {
          client.release()
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error interno: ${error.message}`
            }
          ]
        }
      }
    }
  )
}