'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/constants/query-keys';
import { useSupabaseClient } from '@/lib/auth/hooks';
import type { Suggestion, CodeReference } from '@/app/types';
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
  status: string | null;
}

interface CodePatternRow {
  table_name: string;
  column_name: string | null;
  pattern_type: string;
  file_path: string;
  line_number: number | null;
  frequency: number;
}

async function fetchSuggestions(supabase: any, projectId: string) {
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

async function fetchCodePatterns(supabase: any, projectId: string) {
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

export function useSuggestionsQuery(projectId?: string) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.dashboard.suggestions(projectId!),
    queryFn: async () => {
      const [suggestionItems, codePatterns] = await Promise.all([
        fetchSuggestions(supabase, projectId!),
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

      const mapped: Suggestion[] = suggestionItems.map((item) => {
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
          impact: item.sql_snippet ?? undefined,
          codeReferences: codeReferences.length > 0 ? codeReferences : undefined,
        };
      });

      logger.debug(`Mapped ${mapped.length} suggestions with code references`);
      return mapped;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}
