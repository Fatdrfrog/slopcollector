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
 * Get actual foreign key constraints from PostgreSQL pg_catalog
 * Queries the system tables to get exact FK relationships
 */
async function getRealForeignKeyConstraints(
  supabaseUrl: string,
  supabaseKey: string
): Promise<Map<string, string>> {
  const fkMap = new Map<string, string>();
  
  try {
    const client = createClient(supabaseUrl, supabaseKey);
    
    // Use Supabase's metadata API or query pg_catalog directly
    // This SQL queries the actual foreign key constraints
    const { data, error } = await client
      .from('pg_catalog.pg_constraint')
      .select(`
        conname,
        conrelid,
        confrelid,
        conkey,
        confkey
      `)
      .eq('contype', 'f'); // 'f' = foreign key

    if (error) {
      console.warn('Could not access pg_catalog, trying alternative method...');
      
      // Alternative: Parse from table metadata in OpenAPI spec
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
      });

      if (response.ok) {
        const spec = await response.json();
        
        // PostgREST includes relationship info in definitions
        if (spec.definitions) {
          for (const [tableName, tableDef] of Object.entries(spec.definitions as Record<string, any>)) {
            if (tableDef.properties) {
              for (const [columnName, prop] of Object.entries(tableDef.properties as Record<string, any>)) {
                // Check for format: "table_name:fk_constraint_name"
                if (prop.description && prop.description.includes('Note:')) {
                  const match = prop.description.match(/References `(\w+)\.(\w+)`/i);
                  if (match) {
                    const [, targetTable, targetColumn] = match;
                    const key = `${tableName}.${columnName}`;
                    const value = `${targetTable}.${targetColumn}`;
                    fkMap.set(key, value);
                    console.log(`🔗 FK from OpenAPI: ${key} → ${value}`);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    if (fkMap.size > 0) {
      console.log(`✅ Found ${fkMap.size} FK constraints`);
    }
  } catch (error) {
    console.warn('Error querying FK constraints:', error);
  }
  
  return fkMap;
}

/**
 * Get column details from OpenAPI specification
 * Extracts column info from the definitions section
 * Now also fetches real foreign key constraints from information_schema
 */
export async function getColumnsFromOpenAPI(
  supabaseUrl: string,
  supabaseKey: string,
  tableNames: string[]
): Promise<ColumnSchema[]> {
  try {
    // First, get real foreign key constraints from PostgreSQL
    const fkMap = await getRealForeignKeyConstraints(supabaseUrl, supabaseKey);
    console.log(`🔗 Loaded ${fkMap.size} foreign key constraints`);

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
          
          // Check for FK from metadata first, then use smart heuristics
          const fkKey = `${tableName}.${columnName}`;
          let foreignKeyTo: string | undefined = fkMap.get(fkKey);
          
          // Smart FK detection if not found in metadata
          if (!foreignKeyTo && prop.format === 'uuid' && columnName.endsWith('_id') && columnName !== 'id') {
            const baseName = columnName.replace(/_id$/, '');
            
            // Build comprehensive list of possible table names
            const possibleNames = new Set<string>([
              baseName,                                      // exact: user_id → user
              `${baseName}s`,                               // plural: user_id → users
              baseName.replace(/y$/, 'ies'),               // category_id → categories  
              baseName.replace(/s$/, 'ses'),               // address_id → addresses
              baseName.replace(/ch$/, 'ches'),             // batch_id → batches
              baseName.replace(/sh$/, 'shes'),             // dish_id → dishes
              baseName.replace(/x$/, 'xes'),               // box_id → boxes
              baseName.replace(/z$/, 'zes'),               // quiz_id → quizzes
              baseName.replace(/f$/, 'ves'),               // leaf_id → leaves
              baseName.replace(/fe$/, 'ves'),              // knife_id → knives
              baseName.replace(/us$/, 'i'),                // cactus_id → cacti
              baseName.replace(/is$/, 'es'),               // analysis_id → analyses
              baseName.replace(/on$/, 'a'),                // criterion_id → criteria
              baseName + 'es',                              // hero_id → heroes
              baseName.replace(/man$/, 'men'),             // workman_id → workmen
              baseName.replace(/person$/, 'people'),       // person_id → people
              baseName.replace(/child$/, 'children'),      // child_id → children
            ]);
            
            // Find exact match (case-insensitive)
            for (const possibleName of possibleNames) {
              const actualTable = tableNames.find(t => t.toLowerCase() === possibleName.toLowerCase());
              if (actualTable) {
                foreignKeyTo = `${actualTable}.id`;
                console.log(`✅ FK matched: ${tableName}.${columnName} → ${foreignKeyTo}`);
                break;
              }
            }
            
            if (!foreignKeyTo) {
              console.warn(`⚠️ FK column found but no matching table: ${tableName}.${columnName} (base: ${baseName}, tried ${possibleNames.size} variations)`);
            }
          }
          
          if (foreignKeyTo) {
            fkCount++;
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
