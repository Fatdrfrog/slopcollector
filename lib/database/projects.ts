import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type ConnectedProject = Database['public']['Tables']['connected_projects']['Row'];
type ConnectedProjectInsert = Database['public']['Tables']['connected_projects']['Insert'];

/**
 * Database helpers for connected_projects table
 * DRY: Centralized project operations
 */

export async function getConnectedProjects(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('connected_projects')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProjectById(
  supabase: SupabaseClient<Database>,
  projectId: string
) {
  const { data, error } = await supabase
    .from('connected_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

export async function createProject(
  supabase: SupabaseClient<Database>,
  project: ConnectedProjectInsert
) {
  const { data, error } = await supabase
    .from('connected_projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
  updates: Partial<ConnectedProject>
) {
  const { data, error } = await supabase
    .from('connected_projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(
  supabase: SupabaseClient<Database>,
  projectId: string
) {
  const { error } = await supabase
    .from('connected_projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

export async function updateSyncStatus(
  supabase: SupabaseClient<Database>,
  projectId: string,
  success: boolean,
  errorMessage?: string
) {
  const updates: Partial<ConnectedProject> = {
    last_synced_at: new Date().toISOString(),
    connection_error: success ? null : errorMessage,
  };

  return updateProject(supabase, projectId, updates);
}

