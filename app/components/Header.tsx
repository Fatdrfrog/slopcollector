import { memo, useState } from 'react';
import { Database, RefreshCcw, Github, Plus, Layout, Command, LogOut, User, Sparkles } from 'lucide-react';
import type { ProjectSummary } from '../hooks/useProjects';
import { GitHubConnectDialog } from './GitHubConnectDialog';
import { GitHubRepoPicker } from './GitHubRepoPicker';
import { ConnectProjectDialog } from './ConnectProjectDialog';
import { AnimatePresence } from 'motion/react';
import { useSupabaseSession } from '../hooks/useSupabaseSession';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
 * Memoized to prevent re-renders unless props actually change
 */
export const Header = memo(function Header({
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
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const { user } = useSupabaseSession();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const isGitHubUser = user?.app_metadata?.provider === 'github';

  return (
    <>
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none mb-1">Database Schema</h1>
            <p className="text-xs text-muted-foreground">{tableCount} tables detected</p>
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Select 
            value={activeProjectId} 
            onValueChange={onProjectChange}
            disabled={projects.length === 0}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.projectName}
                </SelectItem>
              ))}
              {projects.length === 0 && <SelectItem value="no-projects" disabled>No projects found</SelectItem>}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowConnectDialog(true)}
            title="Add another Supabase project"
          >
            <Plus className="w-4 h-4" />
          </Button>

          {activeProject?.githubEnabled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
              <Github className="w-3.5 h-3.5" />
              <span>Linked</span>
            </div>
          ) : activeProjectId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGitHubDialog(true)}
              className="h-9 text-muted-foreground hover:text-foreground"
            >
              <Github className="w-4 h-4 mr-2" />
              Connect GitHub
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefresh()}
          disabled={isSyncing}
          className="h-9"
        >
          <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => onGenerateAdvice()}
          disabled={isGeneratingAdvice || !activeProjectId}
          className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
        >
          {isGeneratingAdvice ? (
            <Sparkles className="w-3.5 h-3.5 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-2" />
          )}
          {isGeneratingAdvice ? 'Analyzing...' : 'AI Advice'}
        </Button>

        <div className="h-6 w-px bg-border mx-2" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSuggestions}
          className={showSuggestions ? "bg-accent text-accent-foreground" : ""}
          title="Toggle Suggestions Panel"
        >
          <Layout className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenCommandPalette}
          title="Command Palette (⌘K)"
        >
          <Command className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="w-4 h-4 text-primary" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSignOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    {/* GitHub Connect Dialog - Use repo picker for GitHub OAuth users */}
    <AnimatePresence>
      {showGitHubDialog && activeProject && (
        isGitHubUser ? (
          <GitHubRepoPicker
            projectId={activeProject.id}
            projectName={activeProject.projectName}
            onClose={() => setShowGitHubDialog(false)}
            onSuccess={() => {
              onRefresh();
            }}
          />
        ) : (
          <GitHubConnectDialog
            projectId={activeProject.id}
            projectName={activeProject.projectName}
            onClose={() => setShowGitHubDialog(false)}
            onSuccess={() => {
              onRefresh();
            }}
          />
        )
      )}
    </AnimatePresence>

    {/* Connect Project Dialog */}
    <ConnectProjectDialog
      open={showConnectDialog}
      onOpenChange={setShowConnectDialog}
      onSuccess={() => {
        onRefresh();
      }}
    />
    </>
  );
});
