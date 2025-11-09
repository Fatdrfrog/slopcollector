import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Schema Introspection
 * Uses PostgREST OpenAPI spec - works with just URL + anon key
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
 * Get table list from Supabase OpenAPI specification
 * This ALWAYS works with just the anon key!
 */
export async function getSimpleTableList(
  supabaseUrl: string,
  supabaseKey: string
): Promise<string[]> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OpenAPI spec');
    }

    const spec = await response.json();
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

/**
 * Get column details from OpenAPI specification
 * Extracts column info from the definitions section
 */
export async function getColumnsFromOpenAPI(
  supabaseUrl: string,
  supabaseKey: string,
  tableNames: string[]
): Promise<ColumnSchema[]> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OpenAPI spec');
    }

    const spec = await response.json();
    const definitions = spec.definitions || {};
    const allColumns: ColumnSchema[] = [];
    
    let fkCount = 0;

    for (const tableName of tableNames) {
      const tableDef = definitions[tableName];
      
      if (tableDef && tableDef.properties) {
        const properties = tableDef.properties;
        const required = tableDef.required || [];
        
        Object.keys(properties).forEach((columnName) => {
          const prop = properties[columnName];
          
          // Map OpenAPI/JSON schema types to PostgreSQL types
          let pgType = 'unknown';
          if (prop.type === 'integer' || prop.type === 'number') {
            pgType = prop.format === 'int8' || prop.format === 'bigint' ? 'bigint' : 'integer';
          } else if (prop.type === 'string') {
            if (prop.format === 'uuid') pgType = 'uuid';
            else if (prop.format === 'date-time' || prop.format === 'timestamp') pgType = 'timestamp with time zone';
            else if (prop.format === 'date') pgType = 'date';
            else if (prop.format === 'time') pgType = 'time';
            else if (prop.maxLength) pgType = `varchar(${prop.maxLength})`;
            else pgType = 'text';
          } else if (prop.type === 'boolean') {
            pgType = 'boolean';
          } else if (prop.type === 'object') {
            pgType = 'jsonb';
          } else if (prop.type === 'array') {
            pgType = prop.items?.type ? `${prop.items.type}[]` : 'array';
          }
          
          // Detect foreign keys by convention (column_name ends with _id and is uuid)
          const isForeignKey = prop.format === 'uuid' && 
                              columnName.endsWith('_id') && 
                              columnName !== 'id';
          
          let foreignKeyTo: string | undefined;
          if (isForeignKey) {
            foreignKeyTo = `${columnName.replace(/_id$/, '')}.id`;
            fkCount++;
            console.log(`🔗 Detected FK: ${tableName}.${columnName} → ${foreignKeyTo}`);
          }
          
          allColumns.push({
            schema: 'public',
            tableName,
            columnName,
            dataType: pgType,
            isNullable: !required.includes(columnName),
            columnDefault: prop.default || null,
            isPrimaryKey: columnName === 'id',
            foreignKeyTo,
          });
        });
      }
    }
    
    console.log(`✅ Detected ${fkCount} foreign key relationships across ${tableNames.length} tables`);

    return allColumns;
  } catch (error) {
    console.error('Error getting columns from OpenAPI:', error);
    return [];
  }
}

/**
 * Main introspection function
 * Simple, clean, reliable - uses only OpenAPI spec
 */
export async function introspectSupabaseProject(
  supabaseUrl: string,
  supabaseKey: string,
  targetSchema = 'public'
): Promise<DatabaseSchemaSnapshot> {
  console.log('🔍 Starting schema introspection for', supabaseUrl);
  
  try {
    // Get table names
    const tableNames = await getSimpleTableList(supabaseUrl, supabaseKey);
    console.log(`✅ Found ${tableNames.length} tables`);

    if (tableNames.length === 0) {
      return {
        tables: [],
        columns: [],
        indexes: [],
      };
    }

    // Get column details
    const columns = await getColumnsFromOpenAPI(supabaseUrl, supabaseKey, tableNames);
    console.log(`✅ Found ${columns.length} columns`);

    const tables: TableSchema[] = tableNames.map(name => ({
      schema: targetSchema,
      tableName: name,
      rowEstimate: null,
      description: null,
    }));

    return {
      tables,
      columns,
      indexes: [],
    };
  } catch (error) {
    console.error('Introspection error:', error);
    return {
      tables: [],
      columns: [],
      indexes: [],
    };
  }
}
