import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Utility functions for managing optimization suggestions
 * Handles status updates for applied/dismissed suggestions
 */

export type SuggestionStatus = 'pending' | 'applied' | 'dismissed' | 'archived';

export interface OptimizationSuggestion {
  id: string;
  project_id: string;
  snapshot_id: string | null;
  table_name: string;
  column_name: string | null;
  suggestion_type: string;
  title: string;
  description: string;
  severity: string;
  impact_score: number | null;
  sql_snippet: string | null;
  status: SuggestionStatus;
  dismissed_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

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
 * Get suggestion statistics for a project
 */
export async function getSuggestionStats(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  total: number;
  pending: number;
  applied: number;
  dismissed: number;
  bySeverity: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('optimization_suggestions')
    .select('status, severity')
    .eq('project_id', projectId);

  if (error || !data) {
    return {
      total: 0,
      pending: 0,
      applied: 0,
      dismissed: 0,
      bySeverity: {},
    };
  }

  const stats = {
    total: data.length,
    pending: data.filter((s) => s.status === 'pending').length,
    applied: data.filter((s) => s.status === 'applied').length,
    dismissed: data.filter((s) => s.status === 'dismissed').length,
    bySeverity: {} as Record<string, number>,
  };

  // Count by severity
  data.forEach((s) => {
    stats.bySeverity[s.severity] = (stats.bySeverity[s.severity] || 0) + 1;
  });

  return stats;
}

