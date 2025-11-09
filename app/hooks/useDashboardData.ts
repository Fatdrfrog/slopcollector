'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Suggestion, Table } from '../types';
import type { DatabaseSchemaSnapshot, TableSchema, IndexSchema } from '@/lib/supabase/introspect';

interface DashboardData {
  tables: Table[];
  suggestions: Suggestion[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

type SchemaSnapshotRow = {
  id: string;
  tables_data: unknown;
  columns_data: unknown;  // ADDED - needed for column information!
  indexes_data: unknown;
  relationships_data: unknown;
  created_at: string;
};

type SuggestionRow = {
  id: string;
  table_name: string;
  column_name: string | null;
  severity: string;
  suggestion_type: string;
  title: string;
  description: string;
  sql_snippet: string | null;
  status: string | null;
};

export function useDashboardData(projectId?: string): DashboardData {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [tables, setTables] = useState<Table[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const mapSnapshotToTables = useCallback((snapshot: DatabaseSchemaSnapshot): Table[] => {
    const indexColumns = snapshot.indexes.reduce<Record<string, Set<string>>>(
      (acc, index) => {
        const key = `${index.schema}.${index.tableName}`;
        if (!acc[key]) {
          acc[key] = new Set();
        }
        index.columns.forEach((column) => {
          const normalized = column.replace(/"/g, '').split(' ')[0];
          acc[key].add(normalized);
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
        acc[key].push(column);
        return acc;
      },
      {}
    );

    return snapshot.tables.map((table, index) => {
      const key = `${table.schema}.${table.tableName}`;
      const columns = columnsGrouped[key] ?? [];
      const columnEntries = columns.map((column) => ({
        name: column.columnName,
        type: column.dataType,
        nullable: column.isNullable,
        indexed: indexColumns[key]?.has(column.columnName) ?? false,
        primaryKey: column.isPrimaryKey ?? false,
        foreignKey: column.foreignKeyTo, // Add FK relationship
      }));

      const rowCount = table.rowEstimate ?? undefined;
      const columnCount = columnEntries.length;

      return {
        id: table.tableName,
        name: table.tableName,
        columns: columnEntries,
        rowCount,
        position: { x: 0, y: 0 }, // Dagre will calculate actual position
        columnCount,
      } as Table;
    });
  }, []);

  const fetchSuggestions = useCallback(
    async (projectId: string) => {
      const { data, error: queryError } = await supabase
        .from('optimization_suggestions')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending');

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as SuggestionRow[];
    },
    [supabase]
  );

  const fetchLatestSnapshot = useCallback(async () => {
    if (!projectId) {
      return null;
    }

    const { data, error: queryError } = await supabase
      .from('schema_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      throw queryError;
    }

    return data as SchemaSnapshotRow | null;
  }, [supabase, projectId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      if (!projectId) {
        setTables([]);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const snapshot = await fetchLatestSnapshot();

      if (!snapshot || !snapshot.tables_data) {
        setTables([]);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Debug: Log what we actually got from database
      console.log('📊 Schema Snapshot Data:', {
        tables_count: Array.isArray(snapshot.tables_data) ? snapshot.tables_data.length : 0,
        columns_count: Array.isArray(snapshot.columns_data) ? snapshot.columns_data.length : 0,
        indexes_count: Array.isArray(snapshot.indexes_data) ? snapshot.indexes_data.length : 0,
        has_columns_data: !!snapshot.columns_data,
        snapshot_id: snapshot.id,
        created_at: snapshot.created_at,
      });

      // Build schema from stored data - ensure we pass columns!
      const schema: DatabaseSchemaSnapshot = {
        tables: (snapshot.tables_data as TableSchema[]) || [],
        columns: (snapshot.columns_data as any[]) || [], 
        indexes: (snapshot.indexes_data as IndexSchema[]) || [],
      };

      // Debug: Log the schema we're mapping
      console.log('🗂️ Mapping schema to tables:', {
        tables: schema.tables.length,
        columns: schema.columns.length,
        indexes: schema.indexes.length,
      });

      const mappedTables = mapSnapshotToTables(schema);
      console.log('✅ Mapped tables:', {
        count: mappedTables.length,
        sample: mappedTables[0] ? {
          name: mappedTables[0].name,
          columnCount: mappedTables[0].columns.length,
          hasColumns: mappedTables[0].columns.length > 0,
        } : null,
      });

      setTables(mappedTables);

      // Fetch suggestions for this project
      const suggestionItems = await fetchSuggestions(projectId);
      const mappedSuggestions: Suggestion[] = suggestionItems.map((item) => ({
        id: item.id,
        tableId: item.table_name,
        tableName: item.table_name,
        columnName: item.column_name ?? undefined,
        severity: mapSeverity(item.severity),
        type: mapCategory(item.suggestion_type),
        title: item.title,
        description: item.description,
        impact: item.sql_snippet ?? undefined,
      }));

      setSuggestions(mappedSuggestions);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchSuggestions, fetchLatestSnapshot, mapSnapshotToTables, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh, projectId]);

  return {
    tables,
    suggestions,
    loading,
    error,
    refresh,
  };
}

function mapSeverity(value: string): Suggestion['severity'] {
  if (value === 'critical' || value === 'error') return 'error';
  if (value === 'warning') return 'warning';
  return 'info';
}

function mapCategory(value: string): Suggestion['type'] {
  switch (value) {
    case 'missing_index':
    case 'composite_index':
      return 'not-indexed';
    case 'unused_column':
      return 'unused';
    case 'slow_query':
      return 'optimization';
    case 'rls_policy':
    case 'foreign_key':
      return 'optimization';
    default:
      return 'optimization';
  }
}

