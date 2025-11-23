import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@/lib/auth/hooks';

/**
 * Hook to manage project state, particularly tracking if suggestions
 * have been generated before for the current project
 */
export function useProjectState(
  activeProjectId: string | null | undefined,
  suggestionsCount: number,
) {
  const supabaseClient = useSupabaseClient();
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState(false);

  // Check if suggestions have been generated before for this project
  useEffect(() => {
    const checkState = async () => {
      if (!activeProjectId || !supabaseClient) {
        setHasGeneratedBefore(false);
        return;
      }

      try {
        // Check if there are any suggestions or analysis jobs for this project
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

  // Also update hasGeneratedBefore when suggestions are loaded
  useEffect(() => {
    if (suggestionsCount > 0) {
      setHasGeneratedBefore(true);
    }
  }, [suggestionsCount]);

  return { hasGeneratedBefore, setHasGeneratedBefore };
}
