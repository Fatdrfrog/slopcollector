'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Github, CheckCircle, AlertCircle, Loader2, Code } from 'lucide-react';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';

interface GitHubRepoPickerProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  private: boolean;
}

export function GitHubRepoPicker({
  projectId,
  projectName,
  onClose,
  onSuccess,
}: GitHubRepoPickerProps) {
  const { user } = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<
    'loading' | 'select' | 'connected' | 'analyzing' | 'analyzed' | 'error'
  >('loading');
  const [error, setError] = useState<string>();
  const [analysisResult, setAnalysisResult] = useState<{
    patternsFound: number;
    tablesAnalyzed: string[];
    suggestions: string[];
  }>();

  const githubToken = user?.app_metadata?.provider_token;
  const isGitHubUser = user?.app_metadata?.provider === 'github';

  // Filter repos based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRepos(repos);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = repos.filter(
      (repo) =>
        repo.full_name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query)
    );
    setFilteredRepos(filtered);
  }, [searchQuery, repos]);

  useEffect(() => {
    if (!isGitHubUser || !githubToken) {
      setStatus('error');
      setError('Please sign in with GitHub to access your repositories');
      setLoading(false);
      return;
    }

    fetchRepos();
  }, [isGitHubUser, githubToken]);

  const fetchRepos = async () => {
    if (!githubToken) return;

    setLoading(true);
    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }

      const data = await response.json();
      setRepos(data);
      setFilteredRepos(data);
      setStatus('select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedRepo) return;

    setConnecting(true);
    setError(undefined);

    try {
      const response = await fetch('/api/internal/github/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          repoUrl: selectedRepo.html_url,
          defaultBranch: selectedRepo.default_branch,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      setStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect GitHub');
      setStatus('error');
    } finally {
      setConnecting(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(undefined);
    setStatus('analyzing');

    try {
      const response = await fetch('/api/internal/github/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysisResult(data);
      setStatus('analyzed');

      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze code');
      setStatus('error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-[#3a3a3a]">
          <div className="w-10 h-10 bg-[#7ed321]/10 border border-[#7ed321]/30 rounded-lg flex items-center justify-center">
            <Github className="w-5 h-5 text-[#7ed321]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Connect GitHub Repository</h2>
            <p className="text-sm text-[#999]">{projectName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {status === 'loading' && (
            <div className="space-y-3">
              {/* Skeleton loader - Notion style */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-[#3a3a3a] bg-[#0f0f0f] animate-pulse">
                  <div className="h-4 bg-[#3a3a3a] rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-[#2a2a2a] rounded w-full mb-2"></div>
                  <div className="h-2 bg-[#2a2a2a] rounded w-1/4"></div>
                </div>
              ))}
            </div>
          )}

          {status === 'select' && (
            <div className="space-y-4">
              <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-3 text-xs text-[#999]">
                <div className="flex items-start gap-2">
                  <Code className="w-4 h-4 mt-0.5 text-[#7ed321]" />
                  <div>
                    <p className="font-bold text-white mb-1">What we'll analyze:</p>
                    <ul className="space-y-1">
                      <li>• Database queries in your code (Supabase client, SQL)</li>
                      <li>• WHERE clauses, JOINs, and ORDER BY patterns</li>
                      <li>• Column usage frequency</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                {/* Search input - Notion style */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-[#3a3a3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all font-mono placeholder:text-[#666]"
                    autoFocus
                  />
                </div>

                <label className="block text-sm font-bold text-white mb-2">
                  {filteredRepos.length} {filteredRepos.length === 1 ? 'repository' : 'repositories'}
                  {searchQuery && ` matching "${searchQuery}"`}
                </label>
                
                {filteredRepos.length === 0 ? (
                  <div className="text-center py-8 text-[#666]">
                    <p className="text-sm">No repositories found</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-[#4ecdc4] hover:text-[#3dbdb5] mt-2 underline"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-transparent">
                    {filteredRepos.map((repo, index) => (
                    <motion.div
                      key={repo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedRepo(repo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRepo(repo);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-selected={selectedRepo?.id === repo.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#7ed321]/30 ${
                        selectedRepo?.id === repo.id
                          ? 'bg-[#7ed321]/10 border-[#7ed321] text-white shadow-lg shadow-[#7ed321]/10 scale-[1.02]'
                          : 'bg-[#0f0f0f] border-[#3a3a3a] text-[#ccc] hover:border-[#7ed321]/50 hover:bg-[#1a1a1a] hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-mono font-bold text-sm">{repo.full_name}</p>
                          {repo.description && (
                            <p className="text-xs text-[#999] mt-1">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="text-[#666]">Branch: {repo.default_branch}</span>
                            {repo.private && (
                              <span className="px-2 py-0.5 bg-[#ff6b6b]/10 text-[#ff6b6b] rounded">
                                Private
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedRepo?.id === repo.id && (
                          <CheckCircle className="w-5 h-5 text-[#7ed321]" />
                        )}
                      </div>
                    </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {status === 'connected' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#7ed321]/10 border border-[#7ed321]/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#7ed321] mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-[#7ed321] mb-1">Repository connected!</p>
                  <p className="text-sm text-[#ccc] mb-2">{selectedRepo?.html_url}</p>
                  <p className="text-xs text-[#999]">
                    Branch: <span className="text-white">{selectedRepo?.default_branch}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-[#4ecdc4] mt-0.5 animate-spin" />
                <div className="flex-1">
                  <p className="font-bold text-[#4ecdc4] mb-1">Analyzing codebase...</p>
                  <p className="text-sm text-[#ccc]">
                    Scanning repository files for database query patterns
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'analyzed' && analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#7ed321]/10 border border-[#7ed321]/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#7ed321] mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-[#7ed321] mb-2">Analysis complete!</p>
                  <div className="text-sm text-[#ccc] space-y-2">
                    <p>
                      Found <span className="text-white font-bold">{analysisResult.patternsFound}</span> query
                      patterns across{' '}
                      <span className="text-white font-bold">{analysisResult.tablesAnalyzed.length}</span> tables
                    </p>
                    {analysisResult.suggestions.length > 0 && (
                      <div className="bg-[#2a2a2a] rounded p-2 text-xs">
                        <p className="text-white font-bold mb-1">Top suggestions:</p>
                        <ul className="space-y-1 text-[#999]">
                          {analysisResult.suggestions.slice(0, 3).map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'error' && error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ff6b6b] mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-[#ff6b6b] mb-1">Error</p>
                  <p className="text-sm text-[#ccc]">{error}</p>
                  {!isGitHubUser && (
                    <p className="text-xs text-[#999] mt-2">
                      Please sign out and sign in again using GitHub OAuth
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 border-t border-[#3a3a3a]">
          {status === 'select' && (
            <>
              <button
                onClick={handleConnect}
                disabled={connecting || !selectedRepo}
                className="flex-1 bg-[#7ed321] hover:bg-[#6bc916] text-black font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Connect Repository
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-[#999] hover:text-white hover:bg-[#3a3a3a] rounded-md transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {status === 'connected' && (
            <>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-1 bg-[#7ed321] hover:bg-[#6bc916] text-black font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4" />
                    Analyze Code Patterns
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-[#999] hover:text-white hover:bg-[#3a3a3a] rounded-md transition-colors"
              >
                Skip
              </button>
            </>
          )}

          {(status === 'error' || status === 'analyzed' || status === 'loading') && (
            <button
              onClick={onClose}
              className="flex-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

