import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Suggestion = Database['public']['Tables']['optimization_suggestions']['Row'];
type SuggestionInsert = Database['public']['Tables']['optimization_suggestions']['Insert'];

/**
 * Database helpers for optimization_suggestions table
 * DRY: Centralized suggestion operations
 */

export async function getSuggestions(
  supabase: SupabaseClient<Database>,
  projectId: string,
  filters?: {
    status?: string;
    severity?: string;
    table?: string;
  }
) {
  let query = supabase
    .from('optimization_suggestions')
    .select('*')
    .eq('project_id', projectId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.table) {
    query = query.eq('table_name', filters.table);
  }

  const { data, error } = await query.order('severity', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createSuggestion(
  supabase: SupabaseClient<Database>,
  suggestion: SuggestionInsert
) {
  const { data, error } = await supabase
    .from('optimization_suggestions')
    .insert(suggestion)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSuggestionStatus(
  supabase: SupabaseClient<Database>,
  suggestionId: string,
  status: 'applied' | 'dismissed' | 'archived'
) {
  const updates: Partial<Suggestion> = { status };
  
  if (status === 'applied') {
    updates.applied_at = new Date().toISOString();
  } else if (status === 'dismissed') {
    updates.dismissed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('optimization_suggestions')
    .update(updates)
    .eq('id', suggestionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSuggestion(
  supabase: SupabaseClient<Database>,
  suggestionId: string
) {
  const { error } = await supabase
    .from('optimization_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) throw error;
}

export async function getPendingSuggestionsCount(
  supabase: SupabaseClient<Database>,
  projectId: string
) {
  const { count, error } = await supabase
    .from('optimization_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
}

