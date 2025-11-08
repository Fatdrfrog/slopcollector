'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Database, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { getBrowserClient } from '@/lib/supabase/client';

const connectProjectSchema = z.object({
  displayName: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  supabaseProjectRef: z
    .string()
    .min(1, 'Project reference is required')
    .regex(/^[a-z0-9]{20}$/, 'Project reference must be exactly 20 lowercase alphanumeric characters'),
  connectionUri: z
    .string()
    .min(1, 'Connection URI is required')
    .regex(/^postgresql:\/\//i, 'Connection URI must start with postgresql://'),
  connectionLabel: z.string().default('default'),
});

type ConnectProjectFormValues = z.infer<typeof connectProjectSchema>;

interface ConnectProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectProjectDialog({
  open,
  onClose,
  onSuccess,
}: ConnectProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const form = useForm<ConnectProjectFormValues>({
    resolver: zodResolver(connectProjectSchema),
    defaultValues: {
      displayName: '',
      supabaseProjectRef: '',
      connectionUri: '',
      connectionLabel: 'default',
    },
  });

  const handleSubmit = async (values: ConnectProjectFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const supabase = getBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Please sign in first');
      }

      // Get or create organization
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);

      let orgId: string;
      if (orgs && orgs.length > 0) {
        orgId = orgs[0].id;
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            slug: user.id.slice(0, 8),
            name: `${user.email?.split('@')[0] ?? 'My'}'s Organization`,
          })
          .select('id')
          .single();

        if (orgError || !newOrg) {
          throw new Error(orgError?.message ?? 'Failed to create organization');
        }
        orgId = newOrg.id;

        // Add user as owner
        await supabase.from('organization_members').insert({
          organization_id: orgId,
          user_id: user.id,
          role: 'owner',
          accepted_at: new Date().toISOString(),
        });
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          organization_id: orgId,
          supabase_project_ref: values.supabaseProjectRef,
          display_name: values.displayName,
        })
        .select('id')
        .single();

      if (projectError || !project) {
        throw new Error(projectError?.message ?? 'Failed to create project');
      }

      // Create connection
      const { error: connError } = await supabase.from('connections').insert({
        project_id: project.id,
        label: values.connectionLabel,
        connection_uri: values.connectionUri,
      });

      if (connError) {
        throw new Error(connError.message);
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="connect-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" aria-hidden="true" />
            Connect Supabase Project
          </DialogTitle>
          <DialogDescription id="connect-dialog-description">
            Add your Supabase project to start analyzing its schema and getting
            AI-powered optimization advice.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Awesome App"
                      aria-describedby="displayName-description"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription id="displayName-description">
                    A friendly name to identify this project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supabaseProjectRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supabase Project Reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="abcdefghijklmnop"
                      aria-describedby="projectRef-description"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription id="projectRef-description">
                    Found in your Supabase project settings (20 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connectionUri"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection URI</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
                      rows={2}
                      className="font-mono text-sm"
                      aria-describedby="connectionUri-description"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription id="connectionUri-description">
                    Use your project&apos;s connection pooler URI (port 6543) or direct
                    connection (port 5432). Password will be encrypted.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} aria-busy={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Connecting...
                  </>
                ) : (
                  'Connect Project'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
