import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@/lib/auth/hooks';

export function useProjectState(
  activeProjectId: string | null | undefined,
  suggestionsCount: number,
) {
  const supabaseClient = useSupabaseClient();
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState(false);

  useEffect(() => {
    const checkState = async () => {
      if (!activeProjectId || !supabaseClient) {
        setHasGeneratedBefore(false);
        return;
      }

      try {
        const [suggestionsResult, completedJobsResult] = await Promise.all([
          supabaseClient
            .from('optimization_suggestions')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', activeProjectId)
            .limit(1),
          supabaseClient
            .from('analysis_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', activeProjectId)
            .eq('job_type', 'ai_advice')
            .eq('status', 'completed')
            .limit(1),
        ]);

        const hasSuggestions = (suggestionsResult.count ?? 0) > 0;
        const hasCompletedJobs = (completedJobsResult.count ?? 0) > 0;

        setHasGeneratedBefore(hasSuggestions || hasCompletedJobs);
      } catch (err) {
        console.error('Error checking project state:', err);
        setHasGeneratedBefore(false);
      }
    };

    void checkState();
  }, [activeProjectId, supabaseClient]);

  useEffect(() => {
    if (suggestionsCount > 0) {
      setHasGeneratedBefore(true);
    }
  }, [suggestionsCount]);

  return { hasGeneratedBefore, setHasGeneratedBefore };
}
