'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

export interface ProjectSummary {
  id: string;
  display_name: string;
  supabase_project_ref: string;
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
      .from('projects')
      .select('id, display_name, supabase_project_ref')
      .order('created_at', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        if (queryError) {
          setError(queryError.message);
          setProjects([]);
          setActiveProjectId(undefined);
          setLoading(false);
          return;
        }

        const projectData = (data ?? []) as ProjectSummary[];
        setProjects(projectData);
        if (!activeProjectId && projectData.length > 0) {
          setActiveProjectId(projectData[0].id);
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

