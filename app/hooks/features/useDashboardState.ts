import { useCallback, useEffect, useState } from 'react';

import { useSupabaseClient } from '@/lib/auth/hooks';
import { useAuthRedirect } from '@/hooks/auth/useAuthRedirect';
import { useSupabaseSession } from '@/hooks/auth/useSupabaseSession';
import { useDashboard } from '@/app/hooks/queries';
import { useProjects } from '@/hooks/queries/useProjects';
import { useAdviceGeneration } from './useAdviceGeneration';
import { useProjectState } from './useProjectState';
import { useTableNavigation } from './useTableNavigation';

interface StatusMessage {
  type: 'success' | 'error' | 'loading';
  message: string;
}

export function useDashboardState() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects();
  
  const {
    tables,
    suggestions,
    loading,
    error,
    refresh,
  } = useDashboard(activeProjectId);
  
  const { user, loading: authLoading } = useSupabaseSession();
  const supabaseClient = useSupabaseClient();

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<StatusMessage | null>(null);

  const { hasGeneratedBefore, setHasGeneratedBefore } = useProjectState(
    activeProjectId,
    suggestions.length
  );

  const {
    isGeneratingAdvice,
    adviceError,
    statusMessage: adviceStatusMessage,
    setStatusMessage: setAdviceStatusMessage,
    handleGenerateAdvice,
  } = useAdviceGeneration(activeProjectId, refresh, setHasGeneratedBefore, setShowSuggestions);

  const { isProcessingCallback } = useAuthRedirect(user, authLoading);

  const handleTableSelect = useCallback((tableId: string | null) => {
    setSelectedTable(tableId);
  }, []);

  useEffect(() => {
    if (!projectsLoading && !authLoading && user && projects.length === 0) {
      const timer = setTimeout(() => {
        setShowConnectDialog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [projectsLoading, authLoading, user, projects.length]);

  const handleSignOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
  }, [supabaseClient]);

  const handleSync = useCallback(async () => {
    if (!activeProjectId) {
      return;
    }

    setSyncStatusMessage({ type: 'loading', message: 'Syncing schema from Supabase...' });

    try {
      const response = await fetch('/api/internal/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProjectId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? response.statusText);
      }

      await refresh();
      
      setSyncStatusMessage({ type: 'success', message: 'Schema synced successfully!' });
      setTimeout(() => setSyncStatusMessage(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync schema.';
      setSyncStatusMessage({ type: 'error', message: errorMsg });
      setTimeout(() => setSyncStatusMessage(null), 5000);
    }
  }, [activeProjectId, refresh]);

  const { selectTable, selectNextTable, clearSelection } = useTableNavigation(
    tables,
    selectedTable,
    setSelectedTable
  );

  const toggleSuggestions = useCallback(() => {
    setShowSuggestions(prev => !prev);
  }, []);

  const selectedTableData = tables.find(t => t.id === selectedTable);

  const displayStatusMessage = syncStatusMessage || adviceStatusMessage;
  const displayError = projectsError || error || adviceError;

  const handleDismissStatus = useCallback(() => {
    if (syncStatusMessage) {
      setSyncStatusMessage(null);
    }
    if (adviceStatusMessage) {
      setAdviceStatusMessage(null);
    }
  }, [syncStatusMessage, adviceStatusMessage, setAdviceStatusMessage]);

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    projectsLoading,
    projectsError,
    tables,
    suggestions,
    loading,
    error,
    refresh,
    user,
    authLoading,
    selectedTable,
    setSelectedTable,
    showCommandPalette,
    setShowCommandPalette,
    showSuggestions,
    setShowSuggestions,
    showConnectDialog,
    setShowConnectDialog,
    hasGeneratedBefore,
    isGeneratingAdvice,
    adviceError,
    statusMessage: displayStatusMessage,
    handleDismissStatus,
    handleGenerateAdvice,
    isProcessingCallback,
    handleTableSelect,
    handleSignOut,
    handleSync,
    selectTable,
    selectNextTable,
    clearSelection,
    toggleSuggestions,
    selectedTableData,
    displayError,
  };
}

