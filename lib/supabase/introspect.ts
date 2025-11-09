import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Schema Introspection
 * Uses Supabase REST API instead of direct PostgreSQL connection
 * Works with Supabase URL + anon key (no pg library needed)
 */

export interface ColumnSchema {
  schema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey?: boolean;
  foreignKeyTo?: string; // Format: "table.column"
}

export interface TableSchema {
  schema: string;
  tableName: string;
  rowEstimate: number | null;
  description: string | null;
}

export interface IndexSchema {
  schema: string;
  tableName: string;
  indexName: string;
  isUnique: boolean;
  isPrimary: boolean;
  columns: string[];
}

export interface DatabaseSchemaSnapshot {
  tables: TableSchema[];
  columns: ColumnSchema[];
  indexes: IndexSchema[];
}

/**
 * Introspect database using Supabase credentials
 * Uses information_schema for complete column and FK information
 */
export async function introspectSupabaseProject(
  supabaseUrl: string,
  supabaseKey: string,
  targetSchema = 'public'
): Promise<DatabaseSchemaSnapshot> {
  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // Comprehensive query to get tables, columns, indexes, and foreign keys in one go
    const schemaQuery = `
      -- Get all tables
      WITH tables AS (
        SELECT 
          t.table_schema as schema,
          t.table_name,
          obj_description((t.table_schema||'.'||t.table_name)::regclass, 'pg_class') as description
        FROM information_schema.tables t
        WHERE t.table_schema = '${targetSchema}'
          AND t.table_type = 'BASE TABLE'
      ),
      -- Get all columns with details
      columns AS (
        SELECT 
          c.table_schema as schema,
          c.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.ordinal_position,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.table_schema, ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = '${targetSchema}'
        ) pk ON c.table_schema = pk.table_schema 
           AND c.table_name = pk.table_name 
           AND c.column_name = pk.column_name
        WHERE c.table_schema = '${targetSchema}'
        ORDER BY c.table_name, c.ordinal_position
      ),
      -- Get foreign key relationships
      foreign_keys AS (
        SELECT
          tc.table_schema as schema,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = '${targetSchema}'
      )
      SELECT 
        json_build_object(
          'tables', (SELECT json_agg(tables) FROM tables),
          'columns', (SELECT json_agg(columns) FROM columns),
          'foreign_keys', (SELECT json_agg(foreign_keys) FROM foreign_keys)
        ) as result;
    `;

    let schemaData: any = null;
    let schemaError: any = null;
    
    try {
      const result = await client.rpc('sql', { query: schemaQuery });
      schemaData = result.data;
      schemaError = result.error;
    } catch (e) {
      schemaError = { message: 'RPC not available' };
    }

    if (schemaError || !schemaData || !Array.isArray(schemaData) || schemaData.length === 0) {
      console.error('Failed to fetch comprehensive schema, trying fallback');
      return await introspectSupabaseProjectFallback(client, targetSchema, supabaseUrl, supabaseKey);
    }

    const result = schemaData[0]?.result;
    if (!result) {
      return await introspectSupabaseProjectFallback(client, targetSchema, supabaseUrl, supabaseKey);
    }

    const tables: TableSchema[] = (result.tables || []).map((row: any) => ({
      schema: row.schema || targetSchema,
      tableName: row.table_name,
      rowEstimate: null,
      description: row.description,
    }));

    // Map foreign keys to columns
    const foreignKeys = result.foreign_keys || [];
    const fkMap = new Map<string, string>();
    foreignKeys.forEach((fk: any) => {
      const key = `${fk.schema}.${fk.table_name}.${fk.column_name}`;
      const value = `${fk.foreign_table_name}.${fk.foreign_column_name}`;
      fkMap.set(key, value);
    });

    const columns: ColumnSchema[] = (result.columns || []).map((row: any) => {
      const key = `${row.schema}.${row.table_name}.${row.column_name}`;
      return {
        schema: row.schema || targetSchema,
        tableName: row.table_name,
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable === 'YES',
        columnDefault: row.column_default,
        isPrimaryKey: row.is_primary_key || false,
        foreignKeyTo: fkMap.get(key),
      };
    });

    // Fetch indexes
    const indexesQuery = `
      SELECT
        schemaname as schema,
        tablename as table_name,
        indexname as index_name,
        indexdef as index_def
      FROM pg_catalog.pg_indexes
      WHERE schemaname = '${targetSchema}'
      ORDER BY tablename, indexname;
    `;

    let indexesData: any[] = [];
    try {
      const result = await client.rpc('sql', { query: indexesQuery });
      indexesData = result.data || [];
    } catch (e) {
      console.error('Failed to fetch indexes:', e);
    }

    const indexes: IndexSchema[] = ((indexesData as any[]) || []).map(row => ({
      schema: row.schema || targetSchema,
      tableName: row.table_name,
      indexName: row.index_name,
      isUnique: (row.index_def || '').includes('UNIQUE'),
      isPrimary: (row.index_def || '').includes('PRIMARY KEY'),
      columns: extractColumnsFromIndexDef(row.index_def),
    }));

    return {
      tables,
      columns,
      indexes,
    };
  } catch (error) {
    console.error('Introspection error:', error);
    
    // Last resort: Try simple table list
    try {
      const tableNames = await getSimpleTableList(supabaseUrl, supabaseKey);
      return {
        tables: tableNames.map(name => ({
          schema: targetSchema,
          tableName: name,
          rowEstimate: null,
          description: null,
        })),
        columns: [],
        indexes: [],
      };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return {
        tables: [],
        columns: [],
        indexes: [],
      };
    }
  }
}

/**
 * Extract column names from PostgreSQL index definition
 */
function extractColumnsFromIndexDef(indexDef: string): string[] {
  if (!indexDef) return [];
  
  // Match column names between parentheses
  const match = indexDef.match(/\(([^)]+)\)/);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(col => col.trim().replace(/"/g, ''))
    .filter(Boolean);
}

/**
 * Fallback introspection when comprehensive query fails
 */
async function introspectSupabaseProjectFallback(
  client: any,
  targetSchema: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<DatabaseSchemaSnapshot> {
  try {
    const tableNames = await getSimpleTableList(supabaseUrl, supabaseKey);
    
    const tables: TableSchema[] = tableNames.map(name => ({
      schema: targetSchema,
      tableName: name,
      rowEstimate: null,
      description: null,
    }));

    // Try to get columns through simple queries
    const columns: ColumnSchema[] = [];
    for (const tableName of tableNames.slice(0, 20)) { // Limit to avoid timeouts
      try {
        const colQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = '${targetSchema}' AND table_name = '${tableName}'
          ORDER BY ordinal_position;
        `;
        const result = await client.rpc('sql', { query: colQuery });
        const data = result.data || [];
        
        if (Array.isArray(data)) {
          data.forEach((row: any) => {
            columns.push({
              schema: targetSchema,
              tableName,
              columnName: row.column_name,
              dataType: row.data_type,
              isNullable: row.is_nullable === 'YES',
              columnDefault: row.column_default,
            });
          });
        }
      } catch (e) {
        console.error(`Failed to fetch columns for ${tableName}:`, e);
      }
    }

    return {
      tables,
      columns,
      indexes: [],
    };
  } catch (error) {
    console.error('Fallback also failed:', error);
    return {
      tables: [],
      columns: [],
      indexes: [],
    };
  }
}

/**
 * Simple version: Just get table list from Supabase
 * Uses PostgREST's automatic schema detection
 */
export async function getSimpleTableList(
  supabaseUrl: string,
  supabaseKey: string
): Promise<string[]> {
  try {
    // Call PostgREST root to get OpenAPI spec
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch schema');
    }

    const spec = await response.json();
    // Extract table names from OpenAPI paths
    const tables = Object.keys(spec.paths || {})
      .filter(path => path.startsWith('/'))
      .map(path => path.substring(1))
      .filter(name => name && !name.includes('{'));

    return tables;
  } catch (error) {
    console.error('Error getting table list:', error);
    return [];
  }
}

