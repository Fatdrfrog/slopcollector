'use client';

import { useSuggestionAction, useBulkSuggestionAction } from '@/hooks/mutations/useSuggestionMutations';
import { useSuggestionsQuery } from './useSuggestionsQuery';
import type { SuggestionStatus } from '@/lib/types';

interface UseSuggestionsOptions {
  projectId: string;
  status?: SuggestionStatus;
}

interface SuggestionStats {
  total: number;
  pending: number;
  applied: number;
  dismissed: number;
  bySeverity: Record<string, number>;
}

export function useSuggestions(options: UseSuggestionsOptions) {
  const { projectId } = options;

  const {
    data: suggestions = [],
    isLoading: loading,
    error,
    refetch,
  } = useSuggestionsQuery(projectId);

  const applySingle = useSuggestionAction(projectId);
  const dismissSingle = useSuggestionAction(projectId);
  const archiveSingle = useSuggestionAction(projectId);
  const applyBulk = useBulkSuggestionAction(projectId);
  const dismissBulk = useBulkSuggestionAction(projectId);

  const stats: SuggestionStats = {
    total: suggestions.length,
    pending: suggestions.filter((s) => s.status === 'pending').length,
    applied: suggestions.filter((s) => s.status === 'applied').length,
    dismissed: suggestions.filter((s) => s.status === 'dismissed').length,
    bySeverity: suggestions.reduce((acc: Record<string, number>, s) => {
      const severity = s.severity || 'info';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {}),
  };

  return {
    suggestions,
    stats,
    loading: loading || applySingle.isPending || dismissSingle.isPending,
    error: error?.message || applySingle.error?.message || dismissSingle.error?.message,

    apply: (suggestionId: string) => 
      applySingle.mutateAsync({ suggestionId, action: 'apply' }),
    dismiss: (suggestionId: string) => 
      dismissSingle.mutateAsync({ suggestionId, action: 'dismiss' }),
    archive: (suggestionId: string) => 
      archiveSingle.mutateAsync({ suggestionId, action: 'archive' }),
    bulkApply: (suggestionIds: string[]) => 
      applyBulk.mutateAsync({ suggestionIds, action: 'apply' }),
    bulkDismiss: (suggestionIds: string[]) =>
      dismissBulk.mutateAsync({ suggestionIds, action: 'dismiss' }),

    refresh: refetch,
  };
}

export function useSuggestionStats(projectId: string) {
  const { stats, loading, error } = useSuggestions({ projectId });
  
  return {
    stats,
    loading,
    error,
  };
}


