'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/constants/query-keys';
import { useSupabaseClient } from '@/lib/auth/hooks';
import type { DatabaseSchemaSnapshot, TableSchema, IndexSchema, ColumnSchema } from '@/lib/types';
import type { Table } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

interface SchemaSnapshotRow {
  id: string;
  tables_data: unknown;
  columns_data: unknown;
  indexes_data: unknown;
  relationships_data: unknown;
  created_at: string;
}

export function useSchemaSnapshot(projectId?: string) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.schema.snapshot(projectId!),
    queryFn: async () => {
      logger.debug('Fetching schema snapshot for project:', projectId);

      const { data, error } = await supabase
        .from('schema_snapshots')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      logger.debug('Schema snapshot fetched:', {
        hasData: !!data,
        snapshotId: data?.id,
      });

      return data as SchemaSnapshotRow | null;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

function mapSnapshotToTables(snapshot: DatabaseSchemaSnapshot): Table[] {
  const indexColumns = snapshot.indexes.reduce<Record<string, Set<string>>>(
    (acc, index) => {
      const key = `${index.schema}.${index.tableName}`;
      if (!acc[key]) {
        acc[key] = new Set();
      }
      index.columns.forEach((column) => {
        const normalized = column.replace(/"/g, '').split(' ')[0];
        acc[key]!.add(normalized!);
      });
      return acc;
    },
    {}
  );

  const columnsGrouped = snapshot.columns.reduce<Record<string, typeof snapshot.columns>>(
    (acc, column) => {
      const key = `${column.schema}.${column.tableName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key]!.push(column);
      return acc;
    },
    {}
  );

  return snapshot.tables.map((table) => {
    const key = `${table.schema}.${table.tableName}`;
    const columns = columnsGrouped[key] ?? [];
    
    const columnEntries = columns.map((column) => ({
      name: column.columnName,
      type: column.dataType,
      nullable: column.isNullable,
      indexed: indexColumns[key]?.has(column.columnName) ?? false,
      primaryKey: column.isPrimaryKey ?? false,
      foreignKey: column.foreignKeyTo,
    }));

    return {
      id: table.tableName,
      name: table.tableName,
      columns: columnEntries,
      rowCount: table.rowEstimate ?? undefined,
      position: { x: 0, y: 0 },
      columnCount: columnEntries.length,
    } as Table;
  });
}

export function useTables(projectId?: string) {
  const { data: snapshot } = useSchemaSnapshot(projectId);

  return useQuery({
    queryKey: queryKeys.dashboard.tables(projectId!),
    queryFn: () => {
      if (!snapshot?.tables_data) {
        logger.debug('No snapshot data available for tables');
        return [];
      }

      const schema: DatabaseSchemaSnapshot = {
        tables: (snapshot.tables_data as TableSchema[]) || [],
        columns: (snapshot.columns_data as ColumnSchema[]) || [],
        indexes: (snapshot.indexes_data as IndexSchema[]) || [],
      };

      logger.debug('Mapping schema to tables:', {
        tableCount: schema.tables.length,
        columnCount: schema.columns.length,
        indexCount: schema.indexes.length,
      });

      return mapSnapshotToTables(schema);
    },
    enabled: !!projectId && !!snapshot,
    staleTime: 5 * 60 * 1000,
  });
}
