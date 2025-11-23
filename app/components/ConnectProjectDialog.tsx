'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { authToasts } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/app/components/ui/form';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Loader2, Database, ExternalLink } from 'lucide-react';

const connectProjectSchema = z.object({
  supabaseUrl: z.string().url('Please enter a valid Supabase URL').refine(
    (url) => url.includes('supabase.co') || url.includes('localhost'),
    'Must be a valid Supabase URL'
  ),
  supabaseKey: z.string().min(20, 'Please enter your Supabase anon or service role key'),
});

type ConnectProjectFormValues = z.infer<typeof connectProjectSchema>;

interface ConnectProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FlowStatus = 
  | 'input'           // User entering credentials
  | 'connecting'      // Verifying credentials
  | 'syncing'         // Fetching schema from Supabase
  | 'analyzing'       // Running AI advice
  | 'complete'        // All done, showing success
  | 'error';          // Something went wrong

const normalizeSupabaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const deriveProjectName = (url: string) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    if (hostname === 'localhost') {
      return 'Local Supabase';
    }

    const withoutKnownDomain = hostname.endsWith('.supabase.co')
      ? hostname.slice(0, -'.supabase.co'.length)
      : hostname;

    const parts = withoutKnownDomain.split(/[-._]/).filter(Boolean);

    if (parts.length === 0) {
      return 'Supabase Project';
    }

    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  } catch {
    return 'Supabase Project';
  }
};

/**
 * Dialog for connecting a new Supabase project
 * Only shown to authenticated users
 */
export function ConnectProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: ConnectProjectDialogProps) {
  const router = useRouter();
  const [status, setStatus] = useState<FlowStatus>('input');
  const [error, setError] = useState<string>();
  const [projectName, setProjectName] = useState<string>();
  const [progress, setProgress] = useState({
    tablesFound: 0,
    suggestionsGenerated: 0,
  });

  const form = useForm<ConnectProjectFormValues>({
    resolver: zodResolver(connectProjectSchema),
    defaultValues: {
      supabaseUrl: '',
      supabaseKey: '',
    },
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStatus('input');
        setError(undefined);
        setProjectName(undefined);
        setProgress({ tablesFound: 0, suggestionsGenerated: 0 });
        form.reset();
      }, 300); // After dialog animation
    }
  }, [open, form]);

  const handleConnect = async (values: ConnectProjectFormValues) => {
    setStatus('connecting');
    setError(undefined);

    const normalizedUrl = normalizeSupabaseUrl(values.supabaseUrl);
    const supabaseKey = values.supabaseKey.trim();
    const derivedProjectName = deriveProjectName(normalizedUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Step 1: Verify credentials
      const testResponse = await fetch(`${normalizedUrl}/rest/v1/`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
          'Cache-Control': 'no-store',
        },
        signal: controller.signal,
      });

      if (!testResponse.ok) {
        throw new Error('Invalid Supabase credentials. Check your URL and API key.');
      }

      // Step 2: Connect project to database
      const connectResponse = await fetch('/api/internal/projects/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: normalizedUrl,
          supabaseAnonKey: supabaseKey,
          projectName: derivedProjectName,
        }),
      });

      if (!connectResponse.ok) {
        const data = await connectResponse.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to connect project');
      }

      const { projectId: newProjectId } = await connectResponse.json();

      setProjectName(derivedProjectName);

      clearTimeout(timeoutId);

      // Step 3: Sync schema from Supabase
      await syncSchema(newProjectId);

      // Step 4: Generate AI advice
      await generateAdvice(newProjectId);

      // Step 5: Success!
      setStatus('complete');
      authToasts.connectionSuccess();
      
      // Wait 2 seconds to show success, then close and refresh
      setTimeout(() => {
        form.reset();
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Connection timed out. Check your Supabase URL and key, then try again.'
          : err instanceof Error
          ? err.message
          : 'Failed to connect to Supabase';
      authToasts.authError(errorMessage);
      setError(errorMessage);
      setStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const syncSchema = async (projectId: string) => {
    setStatus('syncing');
    
    const response = await fetch('/api/internal/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to sync schema');
    }

    const result = await response.json();
    setProgress((prev) => ({ ...prev, tablesFound: result.tablesCount || 0 }));
  };

  const generateAdvice = async (projectId: string) => {
    setStatus('analyzing');

    const response = await fetch('/api/internal/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? 'Failed to generate advice');
    }

    const result = await response.json();
    setProgress((prev) => ({
      ...prev,
      suggestionsGenerated: result.result?.newSuggestions || 0,
    }));
  };

  // Prevent closing during loading states
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing when in input, complete, or error state
    if (!newOpen && (status === 'connecting' || status === 'syncing' || status === 'analyzing')) {
      return; // Prevent closing during processing
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white max-w-md" onEscapeKeyDown={(e) => {
        // Prevent ESC key closing during processing
        if (status === 'connecting' || status === 'syncing' || status === 'analyzing') {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono font-bold text-white">
            Connect Supabase Project
          </DialogTitle>
          <DialogDescription className="text-[#999] font-mono text-sm">
            Add another project to analyze with SlopCollector
          </DialogDescription>
        </DialogHeader>

        {/* Input State - Enter credentials */}
        {status === 'input' && (
          <>
            <div className="bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 rounded-lg p-3 mb-2">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-[#4ecdc4] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#4ecdc4] font-mono">
                    Dashboard → Settings → API
                  </p>
                </div>
                <div className="text-xs text-[#666] font-mono space-y-1">
                  <p>• Copy "Project URL"</p>
                  <p>• Copy "anon public" key</p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleConnect)} className="space-y-4">
            <FormField
              control={form.control}
              name="supabaseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#ccc] font-mono text-sm">Project URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://xxx.supabase.co"
                      autoComplete="url"
                      disabled={status !== 'input'}
                      autoFocus
                      className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supabaseKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#ccc] font-mono text-sm">
                    API Key (anon/public)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      autoComplete="off"
                      disabled={status !== 'input'}
                      className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[#666] font-mono text-xs">
                    Read-only access. Your key is stored securely.
                  </FormDescription>
                  <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={status !== 'input'}
                className="flex-1 bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono hover:bg-[#2a2a2a]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                disabled={status !== 'input'}
              >
                <Database className="w-4 h-4 mr-2" />
                Connect & Analyze
              </Button>
            </div>
          </form>
        </Form>

        <div className="pt-4 border-t border-[#3a3a3a]">
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-[#4ecdc4] hover:text-[#3dbdb5] font-mono hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Open Supabase Dashboard
          </a>
        </div>
          </>
        )}

        {/* Connecting State */}
        {status === 'connecting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#7ed321]/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#7ed321] animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white mb-1">
                  Verifying Credentials
                </h3>
                <p className="text-sm text-[#999] font-mono">
                  Testing connection to your Supabase project...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Syncing State */}
        {status === 'syncing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#4ecdc4]/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#4ecdc4] animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white mb-1">
                  Syncing Schema
                </h3>
                <p className="text-sm text-[#999] font-mono">
                  Fetching tables, columns, and relationships...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analyzing State */}
        {status === 'analyzing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#f7b731]/10 rounded-full flex items-center justify-center relative">
                <Loader2 className="w-8 h-8 text-[#f7b731] animate-spin" />
                <div className="absolute inset-0 rounded-full bg-[#f7b731]/10 animate-ping"></div>
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white mb-1">
                  Running AI Analysis
                </h3>
                <p className="text-sm text-[#999] font-mono mb-2">
                  GPT analyzing your schema for optimization opportunities...
                </p>
                {progress.tablesFound > 0 && (
                  <p className="text-xs text-[#666] font-mono">
                    Found {progress.tablesFound} tables to analyze
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Complete State */}
        {status === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-[#7ed321]/20 rounded-full flex items-center justify-center"
              >
                <Database className="w-8 h-8 text-[#7ed321]" />
              </motion.div>
              <div>
                <h3 className="text-lg font-mono font-bold text-[#7ed321] mb-1">
                  Project Connected! 🎉
                </h3>
                <p className="text-sm text-[#999] font-mono mb-3">
                  {projectName}
                </p>
                <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-3 space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#666]">Tables synced:</span>
                    <span className="text-white font-bold">{progress.tablesFound}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#666]">AI suggestions:</span>
                    <span className="text-[#7ed321] font-bold">{progress.suggestionsGenerated}</span>
                  </div>
                </div>
                <p className="text-xs text-[#666] font-mono mt-3">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {status === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="destructive" className="bg-[#ff6b6b]/10 border-[#ff6b6b] mb-4">
              <AlertDescription className="text-[#ff6b6b] font-mono text-sm">
                {error}
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStatus('input');
                  setError(undefined);
                }}
                className="flex-1 bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono hover:bg-[#2a2a2a]"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

