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
    if (!activeProjectId || !supabaseClient) return;

    const channel = supabaseClient.channel(`project-${activeProjectId}`);

    channel
      .on('broadcast', { event: 'advice-completed' }, async (payload: any) => {
        const data = payload.payload;
        setIsGeneratingAdvice(false);
        await refresh();
        setHasGeneratedBefore(true);
        setShowSuggestions(true);
        setStatusMessage({
          type: 'success',
          message: `Generated ${data.result?.newSuggestions || 0} optimization suggestions!`
        });
        setTimeout(() => setStatusMessage(null), 4000);
      })
      .on('broadcast', { event: 'advice-failed' }, (payload: any) => {
        const data = payload.payload;
        setIsGeneratingAdvice(false);
        setAdviceError(data.error || 'Analysis failed');
        setStatusMessage({ type: 'error', message: data.error || 'Analysis failed' });
        setTimeout(() => setStatusMessage(null), 5000);
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [activeProjectId, supabaseClient, refresh, setHasGeneratedBefore, setShowSuggestions]);

  const handleGenerateAdvice = useCallback(async () => {
    if (!activeProjectId) {
      setAdviceError('Select a project before generating advice.');
      return;
    }

    setIsGeneratingAdvice(true);
    setAdviceError(undefined);
    setStatusMessage({ type: 'loading', message: 'Queuing analysis...' });

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

      if (result.status === 'queued') {
        setStatusMessage({ type: 'loading', message: 'Analysis queued. Waiting for worker...' });
      } else {
         // Fallback if sync for some reason
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
  }, [activeProjectId, refresh, setHasGeneratedBefore, setShowSuggestions]);

  return {
    isGeneratingAdvice,
    adviceError,
    statusMessage,
    setStatusMessage,
    handleGenerateAdvice,
  };
}
