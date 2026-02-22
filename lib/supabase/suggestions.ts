import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Utility functions for managing optimization suggestions
 * Handles status updates for applied/dismissed suggestions
 * Uses Postgres RPCs for stats (get_suggestion_stats) and full-text search (search_suggestions)
 */

import type { SuggestionStatus, SuggestionSeverity, OptimizationSuggestion } from '@/lib/types';

export type { SuggestionStatus, SuggestionSeverity, OptimizationSuggestion };

export type SearchSuggestionRow = OptimizationSuggestion & { highlighted_description?: string };

/**
 * Mark a suggestion as applied by the user
 * This is called when user explicitly executes the suggested SQL
 */
export async function markSuggestionAsApplied(
  supabase: SupabaseClient,
  suggestionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('optimization_suggestions')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mark a suggestion as dismissed by the user
 * User doesn't want to apply this suggestion
 */
export async function markSuggestionAsDismissed(
  supabase: SupabaseClient,
  suggestionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('optimization_suggestions')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Archive old suggestions (cleanup)
 * Useful for suggestions that are no longer relevant
 */
export async function archiveSuggestion(
  supabase: SupabaseClient,
  suggestionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('optimization_suggestions')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all pending suggestions for a project
 */
export async function getPendingSuggestions(
  supabase: SupabaseClient,
  projectId: string
): Promise<OptimizationSuggestion[]> {
  const { data, error } = await supabase
    .from('optimization_suggestions')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('severity', { ascending: true }) // critical, high, medium, low
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch suggestions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all suggestions for a project (with optional status filter)
 */
export async function getSuggestions(
  supabase: SupabaseClient,
  projectId: string,
  status?: SuggestionStatus
): Promise<OptimizationSuggestion[]> {
  let query = supabase
    .from('optimization_suggestions')
    .select('*')
    .eq('project_id', projectId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query
    .order('severity', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch suggestions:', error);
    return [];
  }

  return data || [];
}

/**
 * Bulk update suggestion statuses
 * Useful for applying/dismissing multiple suggestions at once
 */
export async function bulkUpdateSuggestionStatus(
  supabase: SupabaseClient,
  suggestionIds: string[],
  status: SuggestionStatus
): Promise<{ success: boolean; error?: string }> {
  const updateData: Partial<OptimizationSuggestion> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'applied') {
    updateData.applied_at = new Date().toISOString();
  } else if (status === 'dismissed') {
    updateData.dismissed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('optimization_suggestions')
    .update(updateData)
    .in('id', suggestionIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get suggestion statistics for a project (uses get_suggestion_stats RPC)
 */
export async function getSuggestionStats(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<{
  total: number;
  pending: number;
  applied: number;
  dismissed: number;
  bySeverity: Record<string, number>;
}> {
  const { data, error } = await supabase.rpc('get_suggestion_stats', {
    p_project_id: projectId,
  });

  if (error || data == null) {
    return {
      total: 0,
      pending: 0,
      applied: 0,
      dismissed: 0,
      bySeverity: {},
    };
  }

  const parsed = data as {
    total: number;
    pending: number;
    applied: number;
    dismissed: number;
    bySeverity: Record<string, number>;
  };

  return {
    total: parsed.total ?? 0,
    pending: parsed.pending ?? 0,
    applied: parsed.applied ?? 0,
    dismissed: parsed.dismissed ?? 0,
    bySeverity: parsed.bySeverity ?? {},
  };
}

/**
 * Full-text search over suggestions (uses search_suggestions RPC)
 */
export async function searchSuggestions(
  supabase: SupabaseClient<Database>,
  projectId: string,
  query: string,
  limit = 50
): Promise<SearchSuggestionRow[]> {
  const trimmed = query?.trim();
  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_suggestions', {
    p_project_id: projectId,
    p_query: trimmed,
    p_limit: limit,
  });

  if (error) {
    console.error('Search suggestions error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    project_id: row.project_id,
    snapshot_id: row.snapshot_id,
    table_name: row.table_name,
    column_name: row.column_name,
    suggestion_type: row.suggestion_type,
    title: row.title,
    description: row.description,
    severity: row.severity,
    impact_score: row.impact_score,
    sql_snippet: row.sql_snippet,
    status: (row.status ?? 'pending') as SuggestionStatus,
    applied_at: row.applied_at,
    dismissed_at: row.dismissed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    highlighted_description: row.highlighted_description ?? undefined,
  }));
}

