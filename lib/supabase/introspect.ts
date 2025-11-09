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
 * Uses pg_catalog views via Supabase's PostgREST interface
 */
export async function introspectSupabaseProject(
  supabaseUrl: string,
  supabaseKey: string,
  targetSchema = 'public'
): Promise<DatabaseSchemaSnapshot> {
  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch tables with row estimates
    const tablesQuery = `
      SELECT 
        schemaname as schema,
        tablename as table_name,
        NULL as description
      FROM pg_catalog.pg_tables
      WHERE schemaname = '${targetSchema}'
      ORDER BY tablename;
    `;

    const { data: tablesData, error: tablesError } = await client
      .rpc('sql', { query: tablesQuery })
      .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

    // If RPC is not available, try direct query to information_schema
    if (tablesError || !tablesData) {
      // Fallback: Use REST API to get table list from OpenAPI spec
      const tableNames = await getSimpleTableList(supabaseUrl, supabaseKey);
      
      const tables: TableSchema[] = tableNames.map(name => ({
        schema: targetSchema,
        tableName: name,
        rowEstimate: null,
        description: null,
      }));

      // Get columns for each table
      const columns: ColumnSchema[] = [];
      for (const tableName of tableNames) {
        try {
          const { data } = await client.from(tableName).select('*').limit(0);
          // This won't give us full column info, but it's better than nothing
        } catch (e) {
          // Ignore errors for individual tables
        }
      }

      return {
        tables,
        columns: [],
        indexes: [],
      };
    }

    // Parse tables
    const tables: TableSchema[] = (tablesData as any[]).map(row => ({
      schema: row.schema || targetSchema,
      tableName: row.table_name,
      rowEstimate: null,
      description: row.description,
    }));

    // Fetch columns for all tables
    const columnsQuery = `
      SELECT 
        table_schema as schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = '${targetSchema}'
      ORDER BY table_name, ordinal_position;
    `;

    const { data: columnsData } = await client
      .rpc('sql', { query: columnsQuery })
      .catch(() => ({ data: [] }));

    const columns: ColumnSchema[] = ((columnsData as any[]) || []).map(row => ({
      schema: row.schema || targetSchema,
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      columnDefault: row.column_default,
    }));

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

    const { data: indexesData } = await client
      .rpc('sql', { query: indexesQuery })
      .catch(() => ({ data: [] }));

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

