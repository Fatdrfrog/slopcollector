'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/database.types';

type ConnectedProjectRow = Pick<
  Tables<'connected_projects'>,
  'id' | 'project_name' | 'supabase_url' | 'is_active' | 'last_synced_at'
>;

export interface ProjectSummary {
  id: string;
  projectName: string;
  supabaseUrl: string;
  isActive: boolean;
  lastSyncedAt?: string | null;
}

interface UseProjectsResult {
  projects: ProjectSummary[];
  activeProjectId?: string;
  setActiveProjectId: (projectId: string) => void;
  loading: boolean;
  error?: string;
}

export function useProjects(): UseProjectsResult {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    supabase
      .from('connected_projects')
      .select('id, project_name, supabase_url, is_active, last_synced_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        if (queryError) {
          setError(queryError.message);
          setProjects([]);
          setActiveProjectId(undefined);
          setLoading(false);
          return;
        }

        setError(undefined);

        const projectData = ((data ?? []) as ConnectedProjectRow[]).map((row) => ({
          id: row.id,
          projectName: row.project_name ?? 'Supabase Project',
          supabaseUrl: row.supabase_url,
          isActive: Boolean(row.is_active),
          lastSyncedAt: row.last_synced_at ?? null,
        }));

        setProjects(projectData);

        if (!activeProjectId && projectData.length > 0) {
          const preferred = projectData.find((project) => project.isActive) ?? projectData[0];
          setActiveProjectId(preferred.id);
        }

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading,
    error,
  };
}

