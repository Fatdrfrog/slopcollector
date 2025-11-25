'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { queryKeys } from '@/lib/constants/query-keys';
import { activeProjectIdAtom } from '@/app/store/atoms';
import { useSupabaseClient } from '@/lib/auth/hooks';

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

export function useProjects(): UseProjectsResult {
  const supabase = useSupabaseClient();
  const [activeProjectId, setActiveProjectId] = useAtom(activeProjectIdAtom);

  const { 
    data: projects = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: queryKeys.projects.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connected_projects')
        .select('id, project_name, supabase_url, is_active, last_synced_at, github_enabled, github_repo_url')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as ConnectedProjectRow[] || []).map((row) => ({
        id: row.id,
        projectName: row.project_name || 'Supabase Project',
        supabaseUrl: row.supabase_url,
        isActive: Boolean(row.is_active),
        lastSyncedAt: row.last_synced_at,
        githubEnabled: Boolean(row.github_enabled),
        githubRepoUrl: row.github_repo_url,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      const preferred = projects.find((project: ProjectSummary) => project.isActive) || projects[0];
      if (preferred) {
        setActiveProjectId(preferred.id);
      }
    }
  }, [projects, activeProjectId, setActiveProjectId]);

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading,
    error: queryError instanceof Error ? queryError.message : undefined,
    refresh: async () => { await refetch(); },
  };
}


