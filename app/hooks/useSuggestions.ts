import { useState, useEffect } from 'react';
import type { SuggestionStatus, OptimizationSuggestion } from '@/lib/supabase/suggestions';

interface UseSuggestionsOptions {
  projectId: string;
  status?: SuggestionStatus;
  autoFetch?: boolean;
}

interface SuggestionStats {
  total: number;
  pending: number;
  applied: number;
  dismissed: number;
  bySeverity: Record<string, number>;
}

/**
 * React hook for managing optimization suggestions
 * 
 * Usage:
 * ```tsx
 * const { suggestions, stats, loading, error, apply, dismiss } = useSuggestions({
 *   projectId: 'xxx',
 *   status: 'pending',
 * });
 * ```
 */
export function useSuggestions(options: UseSuggestionsOptions) {
  const { projectId, status, autoFetch = true } = options;
  
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [stats, setStats] = useState<SuggestionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions
  const fetchSuggestions = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ projectId });
      if (status) params.append('status', status);

      const response = await fetch(`/api/internal/suggestions?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!projectId) return;

    try {
      const params = new URLSearchParams({ projectId, stats: 'true' });
      const response = await fetch(`/api/internal/suggestions?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to fetch suggestion stats:', err);
    }
  };

  // Apply a single suggestion
  const apply = async (suggestionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          action: 'apply',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to apply suggestion: ${response.statusText}`);
      }

      // Refresh suggestions and stats
      await Promise.all([fetchSuggestions(), fetchStats()]);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Dismiss a single suggestion
  const dismiss = async (suggestionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          action: 'dismiss',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss suggestion: ${response.statusText}`);
      }

      // Refresh suggestions and stats
      await Promise.all([fetchSuggestions(), fetchStats()]);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Archive a single suggestion
  const archive = async (suggestionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          action: 'archive',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to archive suggestion: ${response.statusText}`);
      }

      // Refresh suggestions and stats
      await Promise.all([fetchSuggestions(), fetchStats()]);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Bulk apply suggestions
  const bulkApply = async (suggestionIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionIds,
          action: 'apply',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to apply suggestions: ${response.statusText}`);
      }

      // Refresh suggestions and stats
      await Promise.all([fetchSuggestions(), fetchStats()]);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Bulk dismiss suggestions
  const bulkDismiss = async (suggestionIds: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/internal/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionIds,
          action: 'dismiss',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss suggestions: ${response.statusText}`);
      }

      // Refresh suggestions and stats
      await Promise.all([fetchSuggestions(), fetchStats()]);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount or when dependencies change
  useEffect(() => {
    if (autoFetch && projectId) {
      void Promise.all([fetchSuggestions(), fetchStats()]);
    }
  }, [projectId, status, autoFetch]);

  return {
    suggestions,
    stats,
    loading,
    error,
    // Actions
    apply,
    dismiss,
    archive,
    bulkApply,
    bulkDismiss,
    // Manual refresh
    refresh: fetchSuggestions,
    refreshStats: fetchStats,
  };
}

/**
 * Hook for suggestion statistics only
 * Lighter weight if you only need counts
 */
export function useSuggestionStats(projectId: string) {
  const [stats, setStats] = useState<SuggestionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ projectId, stats: 'true' });
      const response = await fetch(`/api/internal/suggestions?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      void fetchStats();
    }
  }, [projectId]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}

