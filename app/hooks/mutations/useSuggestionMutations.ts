'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/lib/constants/query-keys';

interface SuggestionActionParams {
  suggestionId: string;
  action: 'apply' | 'dismiss' | 'archive';
}

interface BulkSuggestionActionParams {
  suggestionIds: string[];
  action: 'apply' | 'dismiss';
}

export function useSuggestionAction(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, action }: SuggestionActionParams) => {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action} suggestion`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions.all(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.suggestions(projectId) });

      const actionText = variables.action === 'apply' ? 'applied' : 
                         variables.action === 'dismiss' ? 'dismissed' : 'archived';
      toast.success(`Suggestion ${actionText} successfully`);
    },
    onError: (error: Error, variables) => {
      toast.error(`Failed to ${variables.action} suggestion: ${error.message}`);
    },
  });
}

export function useBulkSuggestionAction(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionIds, action }: BulkSuggestionActionParams) => {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds, action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action} suggestions`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions.all(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.suggestions(projectId) });

      const actionText = variables.action === 'apply' ? 'applied' : 'dismissed';
      toast.success(`${variables.suggestionIds.length} suggestions ${actionText} successfully`);
    },
    onError: (error: Error, variables) => {
      toast.error(`Failed to ${variables.action} suggestions: ${error.message}`);
    },
  });
}
