'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { useSupabaseClient, authToasts } from '@/lib/auth';
import { RaccoonWelcome } from '@/app/components/RaccoonWelcome';
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
import { Loader2, Database, Search, BarChart3, Code2, ExternalLink } from 'lucide-react';

// Supabase credentials authentication
const supabaseConnectSchema = z.object({
  supabaseUrl: z.string().url('Please enter a valid Supabase URL').refine(
    (url) => url.includes('supabase.co') || url.includes('localhost'),
    'Must be a valid Supabase URL'
  ),
  supabaseKey: z.string().min(20, 'Please enter your Supabase anon or service role key'),
});

type SupabaseConnectFormValues = z.infer<typeof supabaseConnectSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [showWelcome, setShowWelcome] = useState(false);

  const connectForm = useForm<SupabaseConnectFormValues>({
    resolver: zodResolver(supabaseConnectSchema),
    defaultValues: { 
      supabaseUrl: '', 
      supabaseKey: '' 
    },
  });

  const handleConnect = async (values: SupabaseConnectFormValues) => {
    setConnecting(true);
    setError(undefined);

    try {
      // Verify credentials by making a test API call
      const testResponse = await fetch(`${values.supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': values.supabaseKey,
          'Authorization': `Bearer ${values.supabaseKey}`,
        },
      });

      if (!testResponse.ok) {
        throw new Error('Invalid Supabase credentials. Check your URL and API key.');
      }

      // Create anonymous session in our app
      const { data: { user }, error: signInError } = await supabase.auth.signInAnonymously();

      if (signInError) throw signInError;

      if (!user) throw new Error('Failed to create session');

      // Store Supabase credentials in user profile
      const { error: profileError } = await supabase
        .from('connected_projects')
        .insert({
          user_id: user.id,
          project_name: 'My Supabase Project',
          supabase_url: values.supabaseUrl,
          supabase_anon_key: values.supabaseKey,
          is_active: true,
        });

      if (profileError) throw profileError;

      // Show welcome animation
      authToasts.signInSuccess();
      setShowWelcome(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Supabase';
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  const handleWelcomeComplete = () => {
    router.push('/');
    router.refresh();
  };

  if (showWelcome) {
    return <RaccoonWelcome onComplete={handleWelcomeComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="h-screen flex flex-col lg:flex-row">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12 relative"
        >
          <div className="max-w-lg w-full">
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-6xl font-mono font-bold text-[#7ed321] mb-2">
                SlopCollector
              </h1>
              <p className="text-base text-[#999] font-mono mb-1">
                Find the slop in your Supabase
              </p>
              <p className="text-xs text-[#666] font-mono">
                No signup. Just paste your project credentials.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8 rounded-lg overflow-hidden bg-[#2a2a2a] border border-[#3a3a3a]"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-auto"
                onError={(e) => {
                  console.error('Raccoon video failed to load:', e);
                  console.log('Video path: /racoon.mp4');
                }}
              >
                <source src="/racoon.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </motion.div>

            {/* Key Features - Compact */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-[#7ed321]" />
                <p className="text-sm text-[#ccc] font-mono">Paste URL + API key → instant access</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[#ff6b6b]" />
                <p className="text-sm text-[#ccc] font-mono">Scan all tables for missing indexes</p>
              </div>
              
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-[#4ecdc4]" />
                <p className="text-sm text-[#ccc] font-mono">See exact performance impact</p>
              </div>

              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4 text-[#f7b731]" />
                <p className="text-sm text-[#ccc] font-mono">Keyboard shortcuts (⌘K to search)</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Auth Forms */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-[#0f0f0f]"
        >
          <motion.div 
            className="w-full max-w-md bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a]"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-mono font-bold text-white mb-2">
                Connect Your Supabase
              </h2>
              <p className="text-sm text-[#999] font-mono">
                Enter your project credentials to start
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive" className="mb-4 bg-[#ff6b6b]/10 border-[#ff6b6b]">
                  <AlertDescription className="text-[#ff6b6b]">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <motion.div 
              className="bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 rounded-lg p-3 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
            </motion.div>

            <Form {...connectForm}>
              <form onSubmit={connectForm.handleSubmit(handleConnect)} className="space-y-4">
                <FormField
                  control={connectForm.control}
                  name="supabaseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#ccc] font-mono text-sm">Project URL</FormLabel>
                      <FormControl>
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                          <Input
                            type="url"
                            placeholder="https://xxx.supabase.co"
                            autoComplete="url"
                            disabled={connecting}
                            className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                            {...field}
                          />
                        </motion.div>
                      </FormControl>
                      <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={connectForm.control}
                  name="supabaseKey"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-[#ccc] font-mono text-sm">API Key (anon/public)</FormLabel>
                        <button
                          type="button"
                          onClick={() => field.onChange(field.value ? '' : field.value)}
                          className="text-xs text-[#4ecdc4] hover:text-[#3dbdb5] font-mono"
                        >
                          {field.value.length > 0 && '***'}
                        </button>
                      </div>
                      <FormControl>
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                          <Input
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            autoComplete="off"
                            disabled={connecting}
                            className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321] text-xs"
                            {...field}
                          />
                        </motion.div>
                      </FormControl>
                      <FormDescription className="text-[#666] font-mono text-xs">
                        Read-only access. Your key stays local.
                      </FormDescription>
                      <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                    disabled={connecting}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Connect & Start
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <motion.div 
              className="mt-6 pt-6 border-t border-[#3a3a3a] space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <a
                href="https://supabase.com/dashboard/project/_/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs text-[#4ecdc4] hover:text-[#3dbdb5] font-mono hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open Supabase Dashboard
              </a>
              <div className="flex items-center justify-center gap-2 text-xs text-[#666] font-mono">
                <span>Tip:</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-[#1a1a1a] border border-[#3a3a3a] rounded">
                  Enter
                </kbd>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
