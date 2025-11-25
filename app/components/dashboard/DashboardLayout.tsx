'use client';

import { AnimatePresence } from 'motion/react';

import type { Table, Suggestion } from '@/lib/types';
import type { ProjectSummary } from '@/hooks/queries/useProjects';
import { CommandPalette } from '@/app/components/CommandPalette';
import { ConnectProjectDialog } from '@/app/components/ConnectProjectDialog';
import { DebugPanel } from '@/app/components/DebugPanel';
import { Header } from '@/app/components/Header';
import { StatusIndicator } from '@/app/components/StatusIndicator';
import { DashboardContent } from './DashboardContent';

interface StatusMessage {
  type: 'success' | 'error' | 'loading';
  message: string;
}

interface DashboardLayoutProps {
  projects: ProjectSummary[];
  activeProjectId: string | undefined;
  setActiveProjectId: (projectId: string) => void;
  projectsLoading: boolean;
  projectsError?: string;
  tables: Table[];
  suggestions: Suggestion[];
  loading: boolean;
  error?: string;
  selectedTable: string | null;
  selectedTableData: Table | undefined;
  showCommandPalette: boolean;
  showSuggestions: boolean;
  showConnectDialog: boolean;
  hasGeneratedBefore: boolean;
  isGeneratingAdvice: boolean;
  adviceError?: string;
  statusMessage: StatusMessage | null;
  userEmail?: string;
  userId?: string;
  onTableSelect: (tableId: string | null) => void;
  onToggleSuggestions: () => void;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  onSelectTableFromPalette: (id: string) => void;
  onRefresh: () => void;
  onSignOut: () => void;
  onGenerateAdvice: () => void;
  onConnectDialogChange: (open: boolean) => void;
  onConnectSuccess: () => void;
  onDismissStatus: () => void;
}

export function DashboardLayout({
  projects,
  activeProjectId,
  setActiveProjectId,
  projectsLoading,
  projectsError,
  tables,
  suggestions,
  loading,
  error,
  selectedTable,
  selectedTableData,
  showCommandPalette,
  showSuggestions,
  showConnectDialog,
  hasGeneratedBefore,
  isGeneratingAdvice,
  adviceError,
  statusMessage,
  userEmail,
  userId,
  onTableSelect,
  onToggleSuggestions,
  onOpenCommandPalette,
  onCloseCommandPalette,
  onSelectTableFromPalette,
  onRefresh,
  onSignOut,
  onGenerateAdvice,
  onConnectDialogChange,
  onConnectSuccess,
  onDismissStatus,
}: DashboardLayoutProps) {
  const displayError = projectsError || error || adviceError;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f]">
      <Header
        tableCount={tables.length}
        showSuggestions={showSuggestions}
        onToggleSuggestions={onToggleSuggestions}
        onOpenCommandPalette={onOpenCommandPalette}
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectChange={setActiveProjectId}
        onRefresh={onRefresh}
        isSyncing={loading}
        userEmail={userEmail}
        onSignOut={onSignOut}
        onGenerateAdvice={onGenerateAdvice}
        isGeneratingAdvice={isGeneratingAdvice}
      />

      {displayError && (
        <div className="bg-red-900/40 text-red-200 text-sm px-4 py-2 border-b border-red-900">
          {displayError}
        </div>
      )}

      {projectsLoading && (
        <div className="bg-indigo-900/30 text-indigo-200 text-sm px-4 py-2 border-b border-indigo-800">
          Loading Supabase projects…
        </div>
      )}

      {loading && (
        <div className="bg-indigo-900/30 text-indigo-200 text-sm px-4 py-2 border-b border-indigo-800">
          Syncing your database schema from Supabase…
        </div>
      )}

      <DashboardContent
        tables={tables}
        suggestions={suggestions}
        selectedTable={selectedTable}
        selectedTableData={selectedTableData}
        showSuggestions={showSuggestions}
        loading={loading}
        hasGeneratedBefore={hasGeneratedBefore}
        isGeneratingAdvice={isGeneratingAdvice}
        onTableSelect={onTableSelect}
        onSync={onRefresh}
        onGenerateAdvice={onGenerateAdvice}
        onStatusChange={async () => {
          // Refetch suggestions after status change to sync with database
          await onRefresh();
        }}
      />

      {showCommandPalette && (
        <CommandPalette
          tables={tables}
          onClose={onCloseCommandPalette}
          onSelectTable={onSelectTableFromPalette}
        />
      )}

      <AnimatePresence>
        {statusMessage && (
          <StatusIndicator
            type={statusMessage.type}
            message={statusMessage.message}
            onDismiss={onDismissStatus}
          />
        )}
      </AnimatePresence>

      <DebugPanel
        activeProjectId={activeProjectId}
        projectsCount={projects.length}
        suggestionsCount={suggestions.length}
        tablesCount={tables.length}
        userId={userId}
      />

      <ConnectProjectDialog
        open={showConnectDialog}
        onOpenChange={onConnectDialogChange}
        onSuccess={onConnectSuccess}
      />
    </div>
  );
}

