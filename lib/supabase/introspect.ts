import { createClient } from '@supabase/supabase-js';


export interface ColumnSchema {
  schema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey?: boolean;
  foreignKeyTo?: string; 
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

async function getRealForeignKeyConstraints(
  supabaseUrl: string,
  supabaseKey: string
): Promise<Map<string, string>> {
  const fkMap = new Map<string, string>();
  
  try {
    const client = createClient(supabaseUrl, supabaseKey);
    

    const { data, error } = await client
      .from('pg_catalog.pg_constraint')
      .select(`
        conname,
        conrelid,
        confrelid,
        conkey,
        confkey
      `)
      .eq('contype', 'f'); 

    if (error) {
      console.warn('Could not access pg_catalog, trying alternative method...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
      });

      if (response.ok) {
        const spec = await response.json();
        
        if (spec.definitions) {
          for (const [tableName, tableDef] of Object.entries(spec.definitions as Record<string, any>)) {
            if (tableDef.properties) {
              for (const [columnName, prop] of Object.entries(tableDef.properties as Record<string, any>)) {
                
                if (prop.description && prop.description.includes('Note:')) {
                  const match = prop.description.match(/References `(\w+)\.(\w+)`/i);
                  if (match) {
                    const [, targetTable, targetColumn] = match;
                    const key = `${tableName}.${columnName}`;
                    const value = `${targetTable}.${targetColumn}`;
                    fkMap.set(key, value);
                  }
                }
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.warn('Error querying FK constraints:', error);
  }
  
  return fkMap;
}

export async function getColumnsFromOpenAPI(
  supabaseUrl: string,
  supabaseKey: string,
  tableNames: string[]
): Promise<ColumnSchema[]> {
  try {
    const fkMap = await getRealForeignKeyConstraints(supabaseUrl, supabaseKey);

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
          
          const fkKey = `${tableName}.${columnName}`;
          let foreignKeyTo: string | undefined = fkMap.get(fkKey);
          
          if (!foreignKeyTo && prop.format === 'uuid' && columnName.endsWith('_id') && columnName !== 'id') {
            const baseName = columnName.replace(/_id$/, '');
            
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
            
            for (const possibleName of possibleNames) {
              const actualTable = tableNames.find(t => t.toLowerCase() === possibleName.toLowerCase());
              if (actualTable) {
                foreignKeyTo = `${actualTable}.id`;
                break;
              }
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
    
    return allColumns;
  } catch (error) {
    console.error('Error getting columns from OpenAPI:', error);
    return [];
  }
}

export async function introspectSupabaseProject(
  supabaseUrl: string,
  supabaseKey: string,
  targetSchema = 'public'
): Promise<DatabaseSchemaSnapshot> {
  
  try {
    const tableNames = await getSimpleTableList(supabaseUrl, supabaseKey);

    if (tableNames.length === 0) {
      return {
        tables: [],
        columns: [],
        indexes: [],
      };
    }

    const columns = await getColumnsFromOpenAPI(supabaseUrl, supabaseKey, tableNames);

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
