'use client';

import { useQuery } from '@tanstack/react-query';

import type { SupabaseClient } from '@supabase/supabase-js';

import { queryKeys } from '@/lib/constants/query-keys';
import { useSupabaseClient } from '@/lib/auth/hooks';
import { searchSuggestions } from '@/lib/supabase/suggestions';
import type { Suggestion, CodeReference } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

interface SuggestionRow {
  id: string;
  table_name: string;
  column_name: string | null;
  severity: string;
  suggestion_type: string;
  title: string;
  description: string;
  sql_snippet: string | null;
  status: 'pending' | 'applied' | 'dismissed' | null;
}

interface CodePatternRow {
  table_name: string;
  column_name: string | null;
  pattern_type: string;
  file_path: string;
  line_number: number | null;
  frequency: number;
}

async function fetchSuggestions(supabase: SupabaseClient, projectId: string) {
  logger.debug('Fetching suggestions for project:', projectId);

  const { data, error } = await supabase
    .from('optimization_suggestions')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['pending', 'applied', 'dismissed'])
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching suggestions:', error);
    throw error;
  }

  logger.debug(`Found ${data?.length || 0} suggestions`);
  return (data ?? []) as SuggestionRow[];
}

async function fetchCodePatterns(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('code_patterns')
    .select('*')
    .eq('project_id', projectId)
    .order('frequency', { ascending: false });

  if (error) {
    logger.error('Failed to fetch code patterns:', error);
    return [];
  }

  return (data ?? []) as CodePatternRow[];
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
    case 'rls_policy':
    case 'foreign_key':
    default:
      return 'optimization';
  }
}

function mapRowToSuggestion(
  item: {
    id: string;
    table_name: string;
    column_name: string | null;
    severity: string;
    suggestion_type: string;
    title: string;
    description: string;
    sql_snippet: string | null;
    status: string | null;
    highlighted_description?: string;
  },
  patternsByTableColumn: Record<string, CodeReference[]>
): Suggestion {
  const patternKey = `${item.table_name}:${item.column_name || '*'}`;
  const columnPatterns = patternsByTableColumn[patternKey];
  const tablePatterns = patternsByTableColumn[`${item.table_name}:*`];
  const codeReferences = [
    ...(columnPatterns || []),
    ...(tablePatterns || []),
  ];

  return {
    id: item.id,
    tableId: item.table_name,
    tableName: item.table_name,
    columnName: item.column_name ?? undefined,
    severity: mapSeverity(item.severity),
    type: mapCategory(item.suggestion_type),
    title: item.title,
    description: item.description,
    highlightedDescription: item.highlighted_description,
    impact: item.sql_snippet ?? undefined,
    codeReferences: codeReferences.length > 0 ? codeReferences : undefined,
    status: (item.status || 'pending') as Suggestion['status'],
  };
}

export function useSuggestionsQuery(projectId?: string, searchQuery?: string) {
  const supabase = useSupabaseClient();
  const hasSearch = Boolean(searchQuery?.trim());

  return useQuery({
    queryKey: [...queryKeys.dashboard.suggestions(projectId!), 'search', searchQuery ?? ''],
    queryFn: async () => {
      const [suggestionItems, codePatterns] = await Promise.all([
        hasSearch
          ? searchSuggestions(supabase, projectId!, searchQuery!.trim(), 50)
          : fetchSuggestions(supabase, projectId!),
        fetchCodePatterns(supabase, projectId!),
      ]);

      const patternsByTableColumn = codePatterns.reduce<Record<string, CodeReference[]>>(
        (acc, pattern) => {
          const key = `${pattern.table_name}:${pattern.column_name || '*'}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key]!.push({
            filePath: pattern.file_path,
            lineNumber: pattern.line_number ?? undefined,
            patternType: pattern.pattern_type as 'query' | 'join' | 'filter' | 'sort',
            frequency: pattern.frequency || 1,
          });
          return acc;
        },
        {}
      );

      const mapped: Suggestion[] = suggestionItems.map((item) =>
        mapRowToSuggestion(item, patternsByTableColumn)
      );

      logger.debug(`Mapped ${mapped.length} suggestions${hasSearch ? ' (search)' : ''}`);
      return mapped;
    },
    enabled: !!projectId,
    staleTime: hasSearch ? 30 * 1000 : 60 * 1000,
  });
}
