'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Github, CheckCircle, AlertCircle, Loader2, Code } from 'lucide-react';

interface GitHubConnectDialogProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GitHubConnectDialog({
  projectId,
  projectName,
  onClose,
  onSuccess,
}: GitHubConnectDialogProps) {
  const [connecting, setConnecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<
    'input' | 'connected' | 'analyzing' | 'analyzed' | 'error'
  >('input');
  const [repoUrl, setRepoUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [githubInfo, setGithubInfo] = useState<{
    repoUrl?: string;
    defaultBranch?: string;
  }>();
  const [analysisResult, setAnalysisResult] = useState<{
    patternsFound: number;
    tablesAnalyzed: string[];
    suggestions: string[];
  }>();
  const [error, setError] = useState<string>();

  const handleConnect = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setConnecting(true);
    setError(undefined);

    try {
      const response = await fetch('/api/internal/github/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          repoUrl: repoUrl.trim(),
          defaultBranch: defaultBranch.trim() || 'main',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      const data = await response.json();

      if (data.hasGitHub) {
        setGithubInfo({
          repoUrl: data.repoUrl,
          defaultBranch: data.defaultBranch,
        });
        setStatus('connected');
      }
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
      
      // Call success callback after a short delay
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
        className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#7ed321]/10 border border-[#7ed321]/30 rounded-lg flex items-center justify-center">
            <Github className="w-5 h-5 text-[#7ed321]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Connect GitHub</h2>
            <p className="text-sm text-[#999]">{projectName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Input Form */}
          {status === 'input' && (
            <div className="space-y-4">
              <div className="text-sm text-[#ccc] space-y-2">
                <p>
                  Enhance AI advice by analyzing your actual codebase usage patterns.
                  Enter your GitHub repository URL to get started.
                </p>
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
              </div>

              {/* Input Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    GitHub Repository URL
                  </label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="w-full bg-[#0f0f0f] border border-[#3a3a3a] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7ed321] font-mono"
                  />
                  <p className="text-xs text-[#666] mt-1">
                    Must be a public repository or accessible with GitHub integration
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">
                    Default Branch (optional)
                  </label>
                  <input
                    type="text"
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#0f0f0f] border border-[#3a3a3a] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#7ed321] font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Connection Success */}
          {status === 'connected' && githubInfo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#7ed321]/10 border border-[#7ed321]/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#7ed321] mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-[#7ed321] mb-1">GitHub repository detected!</p>
                  <p className="text-sm text-[#ccc] mb-2">{githubInfo.repoUrl}</p>
                  <p className="text-xs text-[#999]">
                    Branch: <span className="text-white">{githubInfo.defaultBranch}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analyzing */}
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

          {/* Analysis Results */}
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

          {/* Error */}
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
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          {status === 'input' && (
            <>
              <button
                onClick={handleConnect}
                disabled={connecting || !repoUrl.trim()}
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

          {(status === 'error' || status === 'analyzed') && (
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

