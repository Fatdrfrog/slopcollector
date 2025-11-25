'use client';

import { useCallback } from 'react';

import { DashboardLayout } from '@/app/components/dashboard';
import { LoadingScreen } from '@/app/components/LoadingScreen';
import { useDashboardState } from '@/hooks/features/useDashboardState';
import { useKeyboardShortcuts } from '@/hooks/ui/useKeyboardShortcuts';

export default function Home() {
  const state = useDashboardState();

  const {
    authLoading,
    isProcessingCallback,
    user,
    showCommandPalette,
    setShowCommandPalette,
    selectTable,
    selectNextTable,
    clearSelection,
    toggleSuggestions,
    handleSync,
    handleGenerateAdvice,
    statusMessage,
    handleDismissStatus,
    refresh,
  } = state;

  useKeyboardShortcuts(
    {
      onCommandK: () => setShowCommandPalette(true),
      onEscape: () => {
        setShowCommandPalette(false);
        clearSelection();
      },
      onTab: selectNextTable,
      onCtrlB: toggleSuggestions,
      onCommandR: handleSync,
      onCommandG: handleGenerateAdvice,
    },
    [selectNextTable, clearSelection, toggleSuggestions, handleSync, handleGenerateAdvice, setShowCommandPalette]
  );

  const handleSelectTableFromPalette = useCallback((id: string) => {
    selectTable(id);
    setShowCommandPalette(false);
  }, [selectTable, setShowCommandPalette]);


  const handleConnectSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  if (authLoading || isProcessingCallback || !user) {
    return (
      <LoadingScreen 
        message={isProcessingCallback ? 'Finalizing login...' : 'Loading...'} 
      />
    );
  }

  return (
    <DashboardLayout
      projects={state.projects}
      activeProjectId={state.activeProjectId}
      setActiveProjectId={state.setActiveProjectId}
      projectsLoading={state.projectsLoading}
      projectsError={state.projectsError}
      tables={state.tables}
      suggestions={state.suggestions}
      loading={state.loading}
      error={state.error}
      selectedTable={state.selectedTable}
      selectedTableData={state.selectedTableData}
      showCommandPalette={showCommandPalette}
      showSuggestions={state.showSuggestions}
      showConnectDialog={state.showConnectDialog}
      hasGeneratedBefore={state.hasGeneratedBefore}
      isGeneratingAdvice={state.isGeneratingAdvice}
      adviceError={state.adviceError}
      statusMessage={statusMessage}
      userEmail={user?.email}
      userId={user?.id}
      onTableSelect={state.handleTableSelect}
      onToggleSuggestions={toggleSuggestions}
      onOpenCommandPalette={() => setShowCommandPalette(true)}
      onCloseCommandPalette={() => setShowCommandPalette(false)}
      onSelectTableFromPalette={handleSelectTableFromPalette}
      onRefresh={handleSync}
      onSignOut={state.handleSignOut}
      onGenerateAdvice={handleGenerateAdvice}
      onConnectDialogChange={state.setShowConnectDialog}
      onConnectSuccess={handleConnectSuccess}
      onDismissStatus={handleDismissStatus}
    />
  );
}