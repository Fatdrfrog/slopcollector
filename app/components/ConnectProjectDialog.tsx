'use client';

import { useState } from 'react';
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
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();

  const form = useForm<ConnectProjectFormValues>({
    resolver: zodResolver(connectProjectSchema),
    defaultValues: {
      supabaseUrl: '',
      supabaseKey: '',
    },
  });

  const handleConnect = async (values: ConnectProjectFormValues) => {
    setConnecting(true);
    setError(undefined);

    const normalizedUrl = normalizeSupabaseUrl(values.supabaseUrl);
    const supabaseKey = values.supabaseKey.trim();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Verify credentials by making a lightweight API call
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

      const projectName = deriveProjectName(normalizedUrl);

      // Connect the project
      const connectResponse = await fetch('/api/internal/projects/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUrl: normalizedUrl,
          supabaseAnonKey: supabaseKey,
          projectName,
        }),
      });

      if (!connectResponse.ok) {
        const data = await connectResponse.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to connect project');
      }

      authToasts.connectionSuccess();
      form.reset();
      onOpenChange(false);
      
      // Notify parent and refresh
      if (onSuccess) {
        onSuccess();
      }
      
      router.refresh();
    } catch (err) {
      const errorMessage =
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Connection timed out. Check your Supabase URL and key, then try again.'
          : err instanceof Error
          ? err.message
          : 'Failed to connect to Supabase';
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono font-bold text-white">
            Connect Supabase Project
          </DialogTitle>
          <DialogDescription className="text-[#999] font-mono text-sm">
            Add another project to analyze with SlopCollector
          </DialogDescription>
        </DialogHeader>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Alert variant="destructive" className="bg-[#ff6b6b]/10 border-[#ff6b6b]">
              <AlertDescription className="text-[#ff6b6b] font-mono text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

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
                      disabled={connecting}
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
                      disabled={connecting}
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
                disabled={connecting}
                className="flex-1 bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono hover:bg-[#2a2a2a]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Connect
                  </>
                )}
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
      </DialogContent>
    </Dialog>
  );
}

