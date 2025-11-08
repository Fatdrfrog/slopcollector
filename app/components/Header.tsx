import { Database, RefreshCcw } from 'lucide-react';
import type { ProjectSummary } from '../hooks/useProjects';

interface HeaderProps {
  tableCount: number;
  showSuggestions: boolean;
  onToggleSuggestions: () => void;
  onOpenCommandPalette: () => void;
  projects: ProjectSummary[];
  activeProjectId?: string;
  onProjectChange: (projectId: string) => void;
  onRefresh: () => Promise<void> | void;
  isSyncing: boolean;
  userEmail?: string;
  onSignOut: () => Promise<void> | void;
  onGenerateAdvice: () => Promise<void> | void;
  isGeneratingAdvice: boolean;
}

/**
 * Application header with controls
 */
export function Header({
  tableCount,
  showSuggestions,
  onToggleSuggestions,
  onOpenCommandPalette,
  projects,
  activeProjectId,
  onProjectChange,
  onRefresh,
  isSyncing,
  userEmail,
  onSignOut,
  onGenerateAdvice,
  isGeneratingAdvice,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-800 bg-[#1a1a1a] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-gray-100">Database Schema</h1>
          <span className="text-gray-600 text-sm">·</span>
          <span className="text-gray-400 text-sm">{tableCount} tables</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Database className="w-4 h-4 text-gray-500" />
            <select
              value={activeProjectId ?? (projects[0]?.id ?? '')}
              onChange={(event) => onProjectChange(event.target.value)}
              disabled={projects.length === 0}
              className="bg-[#121212] border border-gray-800 text-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              {projects.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.display_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => onRefresh()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-300 bg-[#121212] border border-gray-800 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {isSyncing ? 'Syncing…' : 'Refresh'}
          </button>

          <button
            onClick={() => onGenerateAdvice()}
            disabled={isGeneratingAdvice}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-indigo-200 bg-indigo-900/30 border border-indigo-800 rounded-md hover:bg-indigo-900/60 transition-colors disabled:opacity-60"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v2" />
              <path d="m16.2 7.8 1.4-1.4" />
              <path d="M21 12h-2" />
              <path d="m16.2 16.2 1.4 1.4" />
              <path d="M12 19v2" />
              <path d="m6.4 17.6 1.4-1.4" />
              <path d="M5 12H3" />
              <path d="m6.4 6.4 1.4 1.4" />
              <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
            </svg>
            {isGeneratingAdvice ? 'Generating…' : 'Run AI Advice'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {userEmail && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#121212] border border-gray-800 text-xs text-gray-400">
            <span className="max-w-[160px] truncate">{userEmail}</span>
          </div>
        )}

        <button
          onClick={onToggleSuggestions}
          className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
        >
          {showSuggestions ? 'Hide' : 'Show'} Suggestions
        </button>

        <button
          onClick={onOpenCommandPalette}
          className="px-3 py-1.5 text-sm bg-white text-black hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
        >
          Command Palette
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-300 rounded">⌘K</kbd>
        </button>

        <button
          onClick={() => onSignOut()}
          disabled={!userEmail}
          className="px-2.5 py-1.5 text-xs text-gray-300 border border-gray-800 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
