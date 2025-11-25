'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { useSupabaseClient, authToasts } from '@/lib/auth';
import { videoUrls } from '@/lib/supabase/storage';
import { 
  PasswordInput, 
  PasswordStrength, 
  OAuthButtons 
} from '@/app/components/auth';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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
import { Loader2, Database, Search, BarChart3, Code2 } from 'lucide-react';

// Sign In Schema
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Sign Up Schema
const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [emailSent, setEmailSent] = useState(false);

  // Get error from URL params (from auth callback)
  const urlError = searchParams?.get('error');

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleSignIn = async (values: SignInFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        authToasts.signInSuccess();
        
        // Redirect to returnTo path if specified, otherwise dashboard
        const returnTo = searchParams?.get('returnTo');
        if (returnTo && returnTo !== '/') {
          window.location.href = returnTo;
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email: values.email,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists. Please sign in instead.');
          setActiveTab('signin');
        } else {
          setEmailSent(true);
          authToasts.emailSent();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a] text-center"
        >
          <div className="w-16 h-16 bg-[#7ed321]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-[#7ed321]" />
          </div>
          <h2 className="text-2xl font-mono font-bold text-white mb-2">
            Check Your Email
          </h2>
          <p className="text-[#999] font-mono text-sm mb-6">
            We've sent a verification link to <strong className="text-white">{signUpForm.getValues('email')}</strong>
          </p>
          <p className="text-[#666] font-mono text-xs mb-6">
            Click the link in the email to verify your account and sign in.
          </p>
          <Button
            onClick={() => setEmailSent(false)}
            variant="outline"
            className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono hover:bg-[#2a2a2a] hover:border-[#7ed321]"
          >
            Back to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="h-screen flex flex-col lg:flex-row">
        {/* Left Side - Value Proposition */}
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
                AI-powered Supabase schema advisor
              </p>
              <p className="text-xs text-[#666] font-mono">
                Sign up to analyze your projects
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
              >
                <source src={videoUrls.racoon()} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </motion.div>

            {/* Key Features */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-[#7ed321]" />
                <p className="text-sm text-[#ccc] font-mono">Connect multiple Supabase projects</p>
              </div>

              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[#ff6b6b]" />
                <p className="text-sm text-[#ccc] font-mono">Detect missing indexes & bottlenecks</p>
              </div>

              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-[#4ecdc4]" />
                <p className="text-sm text-[#ccc] font-mono">AI-powered optimization advice</p>
              </div>

              <div className="flex items-center gap-3">
                <Code2 className="w-4 h-4 text-[#f7b731]" />
                <p className="text-sm text-[#ccc] font-mono">Developer-friendly interface</p>
              </div>
            </motion.div>

            {/* Product Hunt Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex justify-center lg:justify-start"
            >
              <a 
                href="https://www.producthunt.com/products/slopcollector?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-slopcollector" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-transform hover:scale-105"
              >
                <img 
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1042458&theme=light&t=1764102571390" 
                  alt="SlopCollector - Find the slop in your supabase | Product Hunt" 
                  style={{ width: '250px', height: '54px' }}
                  width={250}
                  height={54}
                />
              </a>
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
            {(error || urlError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <Alert variant="destructive" className="bg-[#ff6b6b]/10 border-[#ff6b6b]">
                  <AlertDescription className="text-[#ff6b6b] font-mono text-sm">
                    {error || urlError}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#1a1a1a]">
                <TabsTrigger 
                  value="signin" 
                  className="font-mono data-[state=active]:bg-[#7ed321] data-[state=active]:text-black text-white"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="font-mono data-[state=active]:bg-[#7ed321] data-[state=active]:text-black text-white"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin">
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#ccc] font-mono text-sm">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              autoComplete="email"
                              disabled={loading}
                              className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#ccc] font-mono text-sm">Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Enter your password"
                              disabled={loading}
                              autoComplete="current-password"
                              className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <a
                        href="/reset-password"
                        className="text-xs text-[#4ecdc4] hover:text-[#3dbdb5] font-mono hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        type="submit"
                        className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold transition-all shadow-lg hover:shadow-xl hover:shadow-[#7ed321]/20"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </Form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#3a3a3a]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#2a2a2a] px-2 text-[#666] font-mono">OR</span>
                  </div>
                </div>

                <OAuthButtons redirectTo="/" />
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#ccc] font-mono text-sm">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              autoComplete="email"
                              disabled={loading}
                              className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#ccc] font-mono text-sm">Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Create a strong password"
                              disabled={loading}
                              autoComplete="new-password"
                              className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all"
                            />
                          </FormControl>
                          <PasswordStrength password={field.value} />
                          <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#ccc] font-mono text-sm">
                            Confirm Password
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Confirm your password"
                              disabled={loading}
                              autoComplete="new-password"
                              className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-2 focus:ring-[#7ed321]/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormDescription className="text-[#666] font-mono text-xs">
                      By signing up, you agree to analyze your Supabase projects with AI.
                    </FormDescription>

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        type="submit"
                        className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold transition-all shadow-lg hover:shadow-xl"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </Form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#3a3a3a]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#2a2a2a] px-2 text-[#666] font-mono">OR</span>
                  </div>
                </div>

                <OAuthButtons redirectTo="/" />
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7ed321]"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
