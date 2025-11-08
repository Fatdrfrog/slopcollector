'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Suggestion, Table } from '../types';
import type { DatabaseSchemaSnapshot } from '@/lib/postgres/introspect';

interface DashboardData {
  tables: Table[];
  suggestions: Suggestion[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

type SchemaSnapshotRow = {
  id: string;
  raw_schema: DatabaseSchemaSnapshot;
  statistics: Record<string, unknown> | null;
  captured_at: string;
};

type AdviceItemRow = {
  id: string;
  run_id: string;
  table_name: string | null;
  column_name: string | null;
  severity: string;
  category: string;
  headline: string;
  description: string;
  remediation: string | null;
  metadata: Record<string, unknown>;
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
        primaryKey: false,
      }));

      const rowCount = table.rowEstimate ?? undefined;
      const columnCount = columnEntries.length;
      const gridWidth = 360;
      const gridHeight = 240;
      const columnsPerRow = 3;

      return {
        id: table.tableName,
        name: table.tableName,
        columns: columnEntries,
        rowCount,
        position: {
          x: 120 + (index % columnsPerRow) * gridWidth,
          y: 120 + Math.floor(index / columnsPerRow) * gridHeight,
        },
        columnCount,
      } as Table;
    });
  }, []);

  const fetchAdviceItems = useCallback(
    async (runId: string) => {
      const { data, error: queryError } = await supabase
        .from('advice_items')
        .select('*')
        .eq('run_id', runId);

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as AdviceItemRow[];
    },
    [supabase]
  );

  const fetchLatestSnapshot = useCallback(async () => {
    if (!projectId) {
      return null;
    }

    const { data, error: queryError } = await supabase
      .from('schema_snapshots')
      .select('id, raw_schema, statistics, captured_at')
      .eq('project_id', projectId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      throw queryError;
    }

    return data as SchemaSnapshotRow | null;
  }, [supabase]);

  const fetchAdviceRunForSnapshot = useCallback(
    async (snapshotId: string) => {
    const { data, error: queryError } = await supabase
        .from('advice_runs')
        .select('id')
        .eq('snapshot_id', snapshotId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      return data as { id: string } | null;
    },
    [supabase]
  );

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

      if (!snapshot || !snapshot.raw_schema) {
        setTables([]);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setTables(mapSnapshotToTables(snapshot.raw_schema));

      const latestRun = await fetchAdviceRunForSnapshot(snapshot.id);
      if (!latestRun) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const adviceItems = await fetchAdviceItems(latestRun.id);
      const mappedSuggestions: Suggestion[] = adviceItems.map((item) => ({
        id: item.id,
        tableId: item.table_name ?? 'global',
        tableName: item.table_name ?? 'Global',
        columnName: item.column_name ?? undefined,
        severity: mapSeverity(item.severity),
        type: mapCategory(item.category),
        title: item.headline,
        description: item.description,
        impact: item.remediation ?? undefined,
      }));

      setSuggestions(mappedSuggestions);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchAdviceItems, fetchAdviceRunForSnapshot, fetchLatestSnapshot, mapSnapshotToTables, projectId]);

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
    case 'index':
    case 'missing_index':
      return 'not-indexed';
    case 'unused':
    case 'stale':
      return 'unused';
    case 'duplication':
      return 'duplicate';
    default:
      return 'optimization';
  }
}

