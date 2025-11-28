'use client';

import { useCallback } from 'react';

import { useTables } from './useTables';
import { useSuggestionsQuery } from './useSuggestionsQuery';
import type { Table, Suggestion } from '@/lib/types';

interface UseDashboardResult {
  tables: Table[];
  suggestions: Suggestion[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

export function useDashboard(projectId?: string): UseDashboardResult {
  const tablesQuery = useTables(projectId);
  const suggestionsQuery = useSuggestionsQuery(projectId);

  const refresh = useCallback(async () => {
    await Promise.all([
      tablesQuery.refetch(),
      suggestionsQuery.refetch(),
    ]);
  }, [tablesQuery.refetch, suggestionsQuery.refetch]);

  return {
    tables: tablesQuery.data ?? [],
    suggestions: suggestionsQuery.data ?? [],
    loading: tablesQuery.isLoading || suggestionsQuery.isLoading,
    error: tablesQuery.error?.message || suggestionsQuery.error?.message,
    refresh,
  };
}
