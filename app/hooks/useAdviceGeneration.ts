import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/lib/auth/hooks';

interface StatusMessage {
  type: 'success' | 'error' | 'loading';
  message: string;
}

export function useAdviceGeneration(
  activeProjectId: string | null | undefined,
  refresh: () => Promise<void>,
  setHasGeneratedBefore: (value: boolean) => void,
  setShowSuggestions: (value: boolean) => void
) {
  const supabaseClient = useSupabaseClient();
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string>();
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  useEffect(() => {
    if (!isGeneratingAdvice || !activeProjectId || !supabaseClient) return;

    const pollInterval = setInterval(async () => {
      const { data: pendingJobs } = await supabaseClient
        .from('analysis_jobs')
        .select('id')
        .eq('project_id', activeProjectId)
        .eq('job_type', 'ai_advice')
        .eq('status', 'pending')
        .limit(1);

      if (!pendingJobs || pendingJobs.length === 0) {
        setIsGeneratingAdvice(false);
        clearInterval(pollInterval);
        refresh();
        setStatusMessage({ type: 'success', message: 'Analysis completed!' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isGeneratingAdvice, activeProjectId, supabaseClient, refresh]);

  const handleGenerateAdvice = useCallback(async () => {
    if (!activeProjectId) {
      setAdviceError('Select a project before generating advice.');
      return;
    }

    setIsGeneratingAdvice(true);
    setAdviceError(undefined);
    setStatusMessage({ type: 'loading', message: 'GPT-5 analyzing your schema...' });

    try {
      const response = await fetch('/api/internal/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProjectId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? response.statusText);
      }

      const result = await response.json();

      if (result.status === 'completed') {
        await refresh();
        setHasGeneratedBefore(true);
        setShowSuggestions(true);
        setStatusMessage({
          type: 'success',
          message: `Generated ${result.result?.newSuggestions || 0} optimization suggestions!`
        });
        setTimeout(() => setStatusMessage(null), 4000);
        setIsGeneratingAdvice(false);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run AI advice.';
      setAdviceError(errorMsg);
      setStatusMessage({ type: 'error', message: errorMsg });
      setTimeout(() => setStatusMessage(null), 5000);
      setIsGeneratingAdvice(false);
    }
  }, [activeProjectId, refresh]);

  return {
    isGeneratingAdvice,
    adviceError,
    statusMessage,
    setStatusMessage,
    handleGenerateAdvice,
  };
}
