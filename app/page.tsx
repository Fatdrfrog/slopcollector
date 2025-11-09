'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './components/Header';
import { ERDCanvas } from './components/ERDCanvas';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { CommandPalette } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTableNavigation } from './hooks/useTableNavigation';
import { useDashboardData } from './hooks/useDashboardData';
import { useProjects } from './hooks/useProjects';
import { useSupabaseSession } from './hooks/useSupabaseSession';
import { mockTables, mockSuggestions } from './data/mockData';
import { getBrowserClient } from '@/lib/supabase/client';

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
  const supabaseClient = useMemo(() => getBrowserClient(), []);

  const [isConnected, setIsConnected] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState<string>();

  const tables = useMemo(
    () => (remoteTables.length > 0 ? remoteTables : mockTables),
    [remoteTables]
  );

  const suggestions = useMemo(
    () => (remoteSuggestions.length > 0 ? remoteSuggestions : mockSuggestions),
    [remoteSuggestions]
  );

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

  const handleSignOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
    setIsConnected(false);
    setAdviceError(undefined);
  }, [supabaseClient]);

  const handleGenerateAdvice = useCallback(async () => {
    if (!activeProjectId) {
      setAdviceError('Select a project before generating advice.');
      return;
    }

    setIsGeneratingAdvice(true);
    setAdviceError(undefined);

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

      await refresh();
    } catch (err) {
      setAdviceError(
        err instanceof Error ? err.message : 'Failed to run AI advice.'
      );
    } finally {
      setIsGeneratingAdvice(false);
    }
  }, [activeProjectId, refresh]);

  // Table navigation handlers
  const { selectTable, selectNextTable, clearSelection } = useTableNavigation(
    tables,
    selectedTable,
    setSelectedTable
  );

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      onCommandK: () => setShowCommandPalette(true),
      onEscape: () => {
        setShowCommandPalette(false);
        clearSelection();
      },
      onTab: selectNextTable,
    },
    [selectNextTable, clearSelection]
  );

  const selectedTableData = tables.find(t => t.id === selectedTable);

  // Redirect to login if not connected
  useEffect(() => {
    if (!authLoading && !user && !isConnected) {
      router.push('/login');
    }
  }, [authLoading, user, isConnected, router]);

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
        onRefresh={refresh}
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
            : 'Syncing latest schema insights…'}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ERDCanvas
            tables={tables}
            selectedTable={selectedTable}
            onTableSelect={selectTable}
          />
        </div>

        {/* Suggestions Panel */}
        {showSuggestions && (
          <SuggestionsPanel
            suggestions={suggestions}
            selectedTable={selectedTableData}
          />
        )}
      </div>

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
    </div>
  );
}