'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/lib/auth/hooks';

/**
 * Extended type for connected_projects with GitHub fields
 * (Database types are auto-generated and may lag behind schema changes)
 */
interface ConnectedProjectRow {
  id: string;
  project_name: string | null;
  supabase_url: string;
  is_active: boolean | null;
  last_synced_at: string | null;
  github_enabled: boolean | null;
  github_repo_url: string | null;
}

export interface ProjectSummary {
  id: string;
  projectName: string;
  supabaseUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  githubEnabled: boolean;
  githubRepoUrl: string | null;
}

interface UseProjectsResult {
  projects: ProjectSummary[];
  activeProjectId?: string;
  setActiveProjectId: (projectId: string) => void;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage connected Supabase projects
 * Uses singleton Supabase client via useSupabaseClient
 */
export function useProjects(): UseProjectsResult {
  const supabase = useSupabaseClient();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const { data, error: queryError } = await supabase
        .from('connected_projects')
        .select('id, project_name, supabase_url, is_active, last_synced_at, github_enabled, github_repo_url')
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const projectData: ProjectSummary[] = (data as ConnectedProjectRow[] || []).map((row) => ({
        id: row.id,
        projectName: row.project_name || 'Supabase Project',
        supabaseUrl: row.supabase_url,
        isActive: Boolean(row.is_active),
        lastSyncedAt: row.last_synced_at,
        githubEnabled: Boolean(row.github_enabled),
        githubRepoUrl: row.github_repo_url,
      }));

      setProjects(projectData);

      // Set active project if not already set
      if (!activeProjectId && projectData.length > 0) {
        const preferred = projectData.find((project) => project.isActive) || projectData[0];
        setActiveProjectId(preferred.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      setProjects([]);
      setActiveProjectId(undefined);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeProjectId]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading,
    error,
    refresh: fetchProjects,
  };
}

