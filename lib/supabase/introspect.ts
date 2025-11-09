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
 * No direct PostgreSQL connection needed!
 */
export async function introspectSupabaseProject(
  supabaseUrl: string,
  supabaseKey: string,
  targetSchema = 'public'
): Promise<DatabaseSchemaSnapshot> {
  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // Use Supabase's introspection function or REST API
    // For now, fetch table metadata from information_schema via RPC
    const { data: tablesData, error: tablesError } = await client
      .rpc('get_tables_info', { schema_name: targetSchema });

    if (tablesError) {
      console.warn('RPC not available, using fallback');
      // Fallback: Return empty structure for now
      // TODO: Implement proper introspection via Supabase Management API
      return {
        tables: [],
        columns: [],
        indexes: [],
      };
    }

    // For MVP, return data structure
    // TODO: Implement proper column and index introspection
    return {
      tables: (tablesData as TableSchema[]) || [],
      columns: [],
      indexes: [],
    };
  } catch (error) {
    console.error('Introspection error:', error);
    // Return empty schema on error - better than crashing
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

