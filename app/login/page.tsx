'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { useSupabaseClient } from '@/lib/auth/hooks';
import { getAuthCallbackUrl, formatAuthError } from '@/lib/auth/utils';
import { authToasts } from '@/lib/auth/toast';
import { EmailSentConfirmation } from '@/app/components/auth/EmailSentConfirmation';
import { PasswordStrength } from '@/app/components/ui/password-strength';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Loader2, Mail, Zap, Lock, Database, Search, BarChart3, Code2 } from 'lucide-react';

// Magic Link (passwordless) - fastest for devs
const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid work email'),
});

// Password auth - for returning users
const passwordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [emailSent, setEmailSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleMagicLink = async (values: MagicLinkFormValues) => {
    setMagicLinkLoading(true);
    setError(undefined);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });

      if (error) throw error;
      authToasts.magicLinkSent(values.email);
      setEmailSent(true);
      
      // Show helpful tip after 3 seconds
      setTimeout(() => authToasts.checkSpam(), 3000);
    } catch (err) {
      const errorMessage = formatAuthError(err, 'Failed to send magic link');
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handlePassword = async (values: PasswordFormValues) => {
    setPasswordLoading(true);
    setError(undefined);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: getAuthCallbackUrl(),
          },
        });

        if (error) throw error;
        authToasts.emailConfirmationSent(values.email);
        setEmailSent(true);
        setTimeout(() => authToasts.checkSpam(), 3000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            authToasts.invalidCredentials();
          } else if (error.message.includes('Email not confirmed')) {
            authToasts.emailNotConfirmed();
          } else {
            authToasts.authError(error.message);
          }
          throw error;
        }
        
        // Show welcome animation before redirecting
        authToasts.signInSuccess();
        setShowWelcome(true);
      }
    } catch (err) {
      const errorMessage = formatAuthError(err, `Failed to ${isSignUp ? 'sign up' : 'sign in'}`);
      setError(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleBack = () => {
    setEmailSent(false);
    magicLinkForm.reset();
    passwordForm.reset();
    setError(undefined);
  };

  const handleWelcomeComplete = () => {
    router.push('/');
    router.refresh();
  };

  if (showWelcome) {
    return <RaccoonWelcome onComplete={handleWelcomeComplete} />;
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a]"
        >
          <EmailSentConfirmation 
            type={isSignUp ? 'confirmation' : 'magic-link'}
            onBack={handleBack}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="h-screen flex flex-col lg:flex-row">
        {/* Left Side - Value Proposition & Raccoon Video */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12 relative"
        >
          <div className="max-w-lg w-full">
            {/* Logo & Headline */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-6xl font-mono font-bold text-[#7ed321] mb-2">
                SlopCollector
              </h1>
              <p className="text-lg text-[#999] font-mono">
                Find the slop in your Supabase schema
              </p>
            </motion.div>

            {/* Raccoon Video - Idle State */}
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
                className="w-full h-auto"
              >
                <source src="/racoon.mp4" type="video/mp4" />
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
                <p className="text-sm text-[#ccc] font-mono">Connect Supabase in one click</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[#ff6b6b]" />
                <p className="text-sm text-[#ccc] font-mono">Find missing indexes instantly</p>
              </div>
              
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-[#4ecdc4]" />
                <p className="text-sm text-[#ccc] font-mono">Get real performance insights</p>
              </div>

              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4 text-[#f7b731]" />
                <p className="text-sm text-[#ccc] font-mono">Keyboard-first workflow (⌘K)</p>
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
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-sm text-[#999] font-mono">
                {isSignUp ? 'Start collecting slop' : 'Welcome back'}
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

            <Tabs defaultValue="magic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#1a1a1a] border border-[#3a3a3a]">
                <TabsTrigger 
                  value="magic" 
                  className="flex items-center gap-2 data-[state=active]:bg-[#7ed321] data-[state=active]:text-black font-mono text-[#999]"
                >
                  <Zap className="w-4 h-4" />
                  Magic
                </TabsTrigger>
                <TabsTrigger 
                  value="password" 
                  className="flex items-center gap-2 data-[state=active]:bg-[#7ed321] data-[state=active]:text-black font-mono text-[#999]"
                >
                  <Lock className="w-4 h-4" />
                  Password
                </TabsTrigger>
              </TabsList>

          <TabsContent value="magic" className="space-y-4">
            <motion.div 
              className="bg-[#7ed321]/10 border border-[#7ed321]/30 rounded-lg p-3 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-[#7ed321] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[#7ed321] font-mono">No password needed</p>
                </div>
              </div>
            </motion.div>

            <Form {...magicLinkForm}>
              <form onSubmit={magicLinkForm.handleSubmit(handleMagicLink)} className="space-y-4">
                <FormField
                  control={magicLinkForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#ccc] font-mono text-sm">Email</FormLabel>
                      <FormControl>
                        <motion.div
                          whileFocus={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Input
                            type="email"
                            placeholder="dev@company.com"
                            autoComplete="email"
                            disabled={magicLinkLoading}
                            className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                            {...field}
                          />
                        </motion.div>
                      </FormControl>
                      <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                    disabled={magicLinkLoading}
                  >
                    {magicLinkLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#ccc] font-mono text-sm">Email</FormLabel>
                      <FormControl>
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                          <Input
                            type="email"
                            placeholder="dev@company.com"
                            autoComplete="email"
                            disabled={passwordLoading}
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
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-[#ccc] font-mono text-sm">Password</FormLabel>
                        {!isSignUp && (
                          <a 
                            href="/reset-password"
                            className="text-xs text-[#4ecdc4] hover:text-[#3dbdb5] font-mono hover:underline"
                          >
                            Forgot?
                          </a>
                        )}
                      </div>
                      <FormControl>
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            disabled={passwordLoading}
                            className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                            {...field}
                          />
                        </motion.div>
                      </FormControl>
                      {isSignUp && (
                        <>
                          <FormDescription className="text-[#666] font-mono text-xs">
                            Min 8 chars
                          </FormDescription>
                          <PasswordStrength password={field.value} />
                        </>
                      )}
                      <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isSignUp ? 'Creating...' : 'Signing in...'}
                        </>
                      ) : (
                        isSignUp ? 'Create Account' : 'Sign In'
                      )}
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.01 }}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-sm text-[#999] hover:text-white hover:bg-[#3a3a3a] font-mono"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(undefined);
                        passwordForm.clearErrors();
                      }}
                      disabled={passwordLoading}
                    >
                      {isSignUp 
                        ? 'Have an account? Sign in' 
                        : "New? Sign up"}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

            <motion.div 
              className="mt-6 pt-6 border-t border-[#3a3a3a]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
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
