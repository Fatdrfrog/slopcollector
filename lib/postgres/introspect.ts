import { Pool } from 'pg';

export interface ColumnSchema {
  schema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
}

export interface TableSchema {
  schema: string;
  tableName: string;
  rowEstimate: number | null;
  totalBytes: number | null;
  description: string | null;
}

export interface IndexSchema {
  schema: string;
  tableName: string;
  indexName: string;
  isUnique: boolean;
  isPrimary: boolean;
  indexDefinition: string;
  columns: string[];
}

export interface DatabaseSchemaSnapshot {
  tables: TableSchema[];
  columns: ColumnSchema[];
  indexes: IndexSchema[];
}

export async function introspectDatabase(
  connectionUri: string,
  targetSchema = 'public'
): Promise<DatabaseSchemaSnapshot> {
  const pool = new Pool({
    connectionString: connectionUri,
    ssl: connectionUri.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
    max: 2,
  });

  const client = await pool.connect();
  try {
    const [tablesResult, columnsResult, indexesResult, sizeResult] =
      await Promise.all([
        client.query<TableSchema>(
          `
            select
              n.nspname as schema,
              c.relname as "tableName",
              nullif(pg_stat_get_live_tuples(c.oid), 0)::bigint as "rowEstimate",
              obj_description(c.oid) as description
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where c.relkind = 'r'
              and n.nspname = $1
            order by c.relname;
          `,
          [targetSchema]
        ),
        client.query(
          `
            select
              table_schema as schema,
              table_name as "tableName",
              column_name as "columnName",
              data_type as "dataType",
              is_nullable = 'YES' as "isNullable",
              column_default as "columnDefault",
              character_maximum_length as "maxLength",
              numeric_precision as "numericPrecision",
              numeric_scale as "numericScale"
            from information_schema.columns
            where table_schema = $1
            order by table_name, ordinal_position;
          `,
          [targetSchema]
        ),
        client.query(
          `
            select
              n.nspname as schema,
              t.relname as "tableName",
              i.relname as "indexName",
              ix.indisunique as "isUnique",
              ix.indisprimary as "isPrimary",
              pg_get_indexdef(ix.indexrelid) as "indexDefinition",
              array(
                select pg_get_indexdef(ix.indexrelid, k + 1, true)
                from generate_subscripts(ix.indkey, 1) as s(k)
              ) as columns
            from pg_class t
            join pg_index ix on ix.indrelid = t.oid
            join pg_class i on i.oid = ix.indexrelid
            join pg_namespace n on n.oid = t.relnamespace
            where t.relkind = 'r'
              and n.nspname = $1;
          `,
          [targetSchema]
        ),
        client.query(
          `
            select
              n.nspname as schema,
              c.relname as "tableName",
              pg_total_relation_size(c.oid) as "totalBytes"
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where c.relkind = 'r'
              and n.nspname = $1;
          `,
          [targetSchema]
        ),
      ]);

    const sizeByTable = new Map<string, number | null>();
    sizeResult.rows.forEach(row => {
      sizeByTable.set(`${row.schema}.${row.tableName}`, row.totalBytes);
    });

    const tables = tablesResult.rows.map(table => ({
      ...table,
      totalBytes: sizeByTable.get(`${table.schema}.${table.tableName}`) ?? null,
    }));

    return {
      tables,
      columns: columnsResult.rows,
      indexes: indexesResult.rows,
    };
  } finally {
    client.release();
    await pool.end();
  }
}

