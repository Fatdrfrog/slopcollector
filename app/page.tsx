'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { ERDCanvas } from './components/ERDCanvas';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { CommandPalette } from './components/CommandPalette';
import { EmptyState } from './components/EmptyState';
import { StatusIndicator } from './components/StatusIndicator';
import { DebugPanel } from './components/DebugPanel';
import { NoSuggestionsPrompt } from './components/NoSuggestionsPrompt';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTableNavigation } from './hooks/useTableNavigation';
import { useDashboardData } from './hooks/useDashboardData';
import { useProjects } from './hooks/useProjects';
import { useSupabaseSession } from './hooks/useSupabaseSession';
import { useSupabaseClient } from '@/lib/auth/hooks';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

/**
 * Main application component for the ERD Panel
 */
export default function Home() {
  const router = useRouter();
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects();
  const {
    tables: remoteTables,
    suggestions: remoteSuggestions,
    loading,
    error,
    refresh,
  } = useDashboardData(activeProjectId);
  const { user, loading: authLoading } = useSupabaseSession();
  const supabaseClient = useSupabaseClient();

  const [isConnected, setIsConnected] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string>();
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'loading';
    message: string;
  } | null>(null);

  // Memoize table selection handler to prevent ERDCanvas re-renders
  const handleTableSelect = useCallback((tableId: string | null) => {
    setSelectedTable(tableId);
  }, []);

  // Use remote data directly (already memoized in useDashboardData)
  const tables = remoteTables;
  const suggestions = remoteSuggestions;

  useEffect(() => {
    if (remoteTables.length > 0) {
      setIsConnected(true);
    }
  }, [remoteTables]);

  useEffect(() => {
    if (user && !isConnected) {
      setIsConnected(true);
    }
  }, [user, isConnected]);

  const handleSignOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
    setIsConnected(false);
    setAdviceError(undefined);
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
      setAdviceError(errorMsg);
      setStatusMessage({ type: 'error', message: errorMsg });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [activeProjectId, refresh]);

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

      // Refresh to get the new suggestions AND updated schema
      // This ensures table issue coloring updates after advice generation
      await refresh();
      
      // Show suggestions panel if hidden
      setShowSuggestions(true);
      
      setStatusMessage({ 
        type: 'success', 
        message: `Generated ${result.result?.newSuggestions || 0} optimization suggestions!` 
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run AI advice.';
      setAdviceError(errorMsg);
      setStatusMessage({ type: 'error', message: errorMsg });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsGeneratingAdvice(false);
    }
  }, [activeProjectId, refresh]);

  // Auto-sync when project changes and no data yet
  useEffect(() => {
    if (activeProjectId && remoteTables.length === 0 && !loading) {
      void handleSync();
    }
  }, [activeProjectId, remoteTables.length, loading, handleSync]);

  // Auto-generate AI advice on first sync if no suggestions exist
  useEffect(() => {
    // Only run if:
    // 1. We have tables (schema synced)
    // 2. We have no suggestions yet
    // 3. Not currently generating
    // 4. Not currently loading
    if (
      activeProjectId &&
      remoteTables.length > 0 &&
      remoteSuggestions.length === 0 &&
      !isGeneratingAdvice &&
      !loading
    ) {
      console.log('🤖 Auto-generating AI advice for first-time project');
      // Delay slightly to let UI settle
      const timer = setTimeout(() => {
        void handleGenerateAdvice();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [activeProjectId, remoteTables.length, remoteSuggestions.length, isGeneratingAdvice, loading, handleGenerateAdvice]);


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

  // Keyboard shortcuts (enhanced)
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

  // Redirect to login if not connected
  useEffect(() => {
    if (!authLoading && !user && !isConnected) {
      router.push('/login');
    }
  }, [authLoading, user, isConnected, router]);

    // Show loading state while checking auth
    if (authLoading || (!user && !isConnected)) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0f0f0f]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
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

      <ResizablePanelGroup direction="horizontal" className="flex-1 flex overflow-hidden">
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
              <ResizablePanel defaultSize={25}>
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
                    hasGeneratedBefore={false}
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
    </div>
  );
}