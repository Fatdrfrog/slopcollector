'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { ERDCanvas } from './components/ERDCanvas';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { CommandPalette } from './components/CommandPalette';
import { EmptyState } from './components/EmptyState';
import { StatusIndicator } from './components/StatusIndicator';
import { DebugPanel } from './components/DebugPanel';
import { NoSuggestionsPrompt } from './components/NoSuggestionsPrompt';
import { ConnectProjectDialog } from './components/ConnectProjectDialog';
import { LoadingScreen } from './components/LoadingScreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTableNavigation } from './hooks/useTableNavigation';
import { useDashboard } from '@/app/hooks/queries';
import { useProjects } from './hooks/useProjects';
import { useSupabaseSession } from './hooks/useSupabaseSession';
import { useSupabaseClient } from '@/lib/auth/hooks';
import { useAdviceGeneration } from './hooks/useAdviceGeneration';
import { useProjectState } from './hooks/useProjectState';
import { useAuthRedirect } from './hooks/useAuthRedirect';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

/**
 * Main application component for the ERD Panel
 */
export default function Home() {
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

  // UI state
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Extract project state management to custom hook first
  const { hasGeneratedBefore, setHasGeneratedBefore } = useProjectState(
    activeProjectId,
    suggestions.length
  );

  // Extract AI advice generation logic to custom hook
  const {
    isGeneratingAdvice,
    adviceError,
    statusMessage,
    setStatusMessage,
    handleGenerateAdvice,
  } = useAdviceGeneration(activeProjectId, refresh, setHasGeneratedBefore, setShowSuggestions);

  // Extract auth redirect logic to custom hook
  const { isProcessingCallback } = useAuthRedirect(user, authLoading);

  // Memoize table selection handler to prevent ERDCanvas re-renders
  const handleTableSelect = useCallback((tableId: string | null) => {
    setSelectedTable(tableId);
  }, []);

  // Auto-show ConnectProjectDialog for first-time users (onboarding)
  useEffect(() => {
    if (!projectsLoading && !authLoading && user && projects.length === 0) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        setShowConnectDialog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [projectsLoading, authLoading, user, projects.length]);

  const handleSignOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
  }, [supabaseClient]);

  const handleSync = useCallback(async () => {
    if (!activeProjectId) {
      return;
    }

    setStatusMessage({ type: 'loading', message: 'Syncing schema from Supabase...' });

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

      // Refresh to get the new schema
      await refresh();
      
      setStatusMessage({ type: 'success', message: 'Schema synced successfully!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync schema.';
      setStatusMessage({ type: 'error', message: errorMsg });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [activeProjectId, refresh, setStatusMessage]);

  // Table navigation handlers
  const { selectTable, selectNextTable, clearSelection } = useTableNavigation(
    tables,
    selectedTable,
    setSelectedTable
  );

  // Toggle suggestions panel
  const toggleSuggestions = useCallback(() => {
    setShowSuggestions(prev => !prev);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      onCommandK: () => setShowCommandPalette(true),
      onEscape: () => {
        setShowCommandPalette(false);
        clearSelection();
      },
      onTab: selectNextTable,
      onCtrlB: toggleSuggestions, // Ctrl+B to toggle suggestions panel
      onCommandR: handleSync, // Cmd/Ctrl+R to refresh
      onCommandG: handleGenerateAdvice, // Cmd/Ctrl+G to generate AI advice
    },
    [selectNextTable, clearSelection, toggleSuggestions, handleSync, handleGenerateAdvice]
  );

  const selectedTableData = tables.find(t => t.id === selectedTable);

  // Show loading state while checking auth or processing callback
  if (authLoading || isProcessingCallback || !user) {
    return (
      <LoadingScreen 
        message={isProcessingCallback ? 'Finalizing login...' : 'Loading...'} 
      />
    );
  }
    
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <Header
        tableCount={tables.length}
        showSuggestions={showSuggestions}
        onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectChange={(projectId) => setActiveProjectId(projectId)}
        onRefresh={handleSync}
        isSyncing={loading}
        userEmail={user?.email}
        onSignOut={handleSignOut}
        onGenerateAdvice={handleGenerateAdvice}
        isGeneratingAdvice={isGeneratingAdvice}
      />

      {(projectsError || error || adviceError) && (
        <div className="bg-red-900/40 text-red-200 text-sm px-4 py-2 border-b border-red-900">
          {projectsError ?? error ?? adviceError}
        </div>
      )}

      {(authLoading || projectsLoading || loading) && (
        <div className="bg-indigo-900/30 text-indigo-200 text-sm px-4 py-2 border-b border-indigo-800">
          {authLoading
            ? 'Checking authentication…'
            : projectsLoading
            ? 'Loading Supabase projects…'
            : 'Syncing your database schema from Supabase…'}
        </div>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1 flex">
        {tables.length === 0 ? (
          <EmptyState onSync={handleSync} isSyncing={loading} />
        ) : (
          <>
            <ResizablePanel defaultSize={75}>
              <ERDCanvas
                tables={tables}
                selectedTable={selectedTable}
                onTableSelect={handleTableSelect}
                suggestions={suggestions}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />

            {showSuggestions && (
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <motion.div
                  initial={{ x: 420, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 420, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="h-full"
                >
                  {suggestions.length === 0 && !loading ? (
                    <NoSuggestionsPrompt
                      onGenerateAdvice={handleGenerateAdvice}
                      isGenerating={isGeneratingAdvice}
                      hasGeneratedBefore={hasGeneratedBefore}
                    />
                  ) : (
                    <SuggestionsPanel
                      suggestions={suggestions}
                      selectedTable={selectedTableData}
                      onSelectTable={handleTableSelect}
                      isLoading={loading}
                    />
                  )}
                </motion.div>
              </ResizablePanel>
            )}
          </>
        )}
      </ResizablePanelGroup>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          tables={tables}
          onClose={() => setShowCommandPalette(false)}
          onSelectTable={(id) => {
            selectTable(id);
            setShowCommandPalette(false);
          }}
        />
      )}

      {/* Status Indicator */}
      <AnimatePresence>
        {statusMessage && (
          <StatusIndicator
            type={statusMessage.type}
            message={statusMessage.message}
            onDismiss={() => setStatusMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* Debug Panel (development only) */}
      <DebugPanel
        activeProjectId={activeProjectId}
        projectsCount={projects.length}
        suggestionsCount={suggestions.length}
        tablesCount={tables.length}
        userId={user?.id}
      />

      {/* Connect Project Dialog (auto-shown for onboarding) */}
      <ConnectProjectDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        onSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
}