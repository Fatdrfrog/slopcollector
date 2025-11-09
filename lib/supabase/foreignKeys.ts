import { createClient } from '@supabase/supabase-js';

export interface ForeignKeyConstraint {
  name: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

/**
 * Fetch foreign key constraints from a Supabase project
 * Uses Supabase Management API to get exact FK relationships
 */
export async function fetchForeignKeyConstraints(
  supabaseUrl: string,
  supabaseKey: string
): Promise<ForeignKeyConstraint[]> {
  try {
    const client = createClient(supabaseUrl, supabaseKey);

    // Query pg_catalog for actual foreign key constraints
    // This requires a database function or direct SQL access
    const query = `
      SELECT
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
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `;

    // Try to execute via RPC if available
    const { data, error } = await client.rpc('exec_sql', { query });

    if (error || !data) {
      console.warn('Could not query foreign keys via RPC, using fallback');
      return [];
    }

    return (data as any[]).map((row) => ({
      name: row.constraint_name,
      sourceTable: row.table_name,
      sourceColumn: row.column_name,
      targetTable: row.foreign_table_name,
      targetColumn: row.foreign_column_name,
    }));
  } catch (error) {
    console.error('Failed to fetch foreign keys:', error);
    return [];
  }
}

/**
 * Build FK map from constraints array
 */
export function buildForeignKeyMap(constraints: ForeignKeyConstraint[]): Map<string, string> {
  const fkMap = new Map<string, string>();
  
  constraints.forEach((fk) => {
    const key = `${fk.sourceTable}.${fk.sourceColumn}`;
    const value = `${fk.targetTable}.${fk.targetColumn}`;
    fkMap.set(key, value);
  });
  
  return fkMap;
}

