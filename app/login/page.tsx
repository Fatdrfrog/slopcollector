'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSupabaseClient } from '@/lib/auth/hooks';
import { getAuthCallbackUrl, formatAuthError } from '@/lib/auth/utils';
import { authToasts } from '@/lib/auth/toast';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { BrandHeader } from '@/app/components/auth/BrandHeader';
import { EmailSentConfirmation } from '@/app/components/auth/EmailSentConfirmation';
import { PasswordStrength } from '@/app/components/ui/password-strength';
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
import { Loader2, Mail, Zap, Lock, ArrowRight } from 'lucide-react';

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
        
        authToasts.signInSuccess();
        router.push('/');
        router.refresh();
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

  if (emailSent) {
    return (
      <AuthLayout>
        <EmailSentConfirmation 
          type={isSignUp ? 'confirmation' : 'magic-link'}
          onBack={handleBack}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <BrandHeader subtitle="Connect your Supabase. Get instant insights." />

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="magic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="magic" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Magic Link
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="magic" className="space-y-4">
            <div className="bg-linear-to-r from-orange-50 to-purple-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Fastest way to get started</p>
                  <p className="text-xs text-gray-600">
                    No password needed. We'll email you a secure link to sign in instantly.
                  </p>
                </div>
              </div>
            </div>

            <Form {...magicLinkForm}>
              <form onSubmit={magicLinkForm.handleSubmit(handleMagicLink)} className="space-y-4">
                <FormField
                  control={magicLinkForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="dev@yourcompany.com"
                          autoComplete="email"
                          disabled={magicLinkLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-linear-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700"
                  disabled={magicLinkLoading}
                >
                  {magicLinkLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send magic link
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={passwordLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        {!isSignUp && (
                          <a 
                            href="/reset-password"
                            className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                          >
                            Forgot password?
                          </a>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete={isSignUp ? 'new-password' : 'current-password'}
                          disabled={passwordLoading}
                          {...field}
                        />
                      </FormControl>
                      {isSignUp && (
                        <>
                          <FormDescription>
                            At least 8 characters recommended
                          </FormDescription>
                          <PasswordStrength password={field.value} />
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </>
                    ) : (
                      isSignUp ? 'Create account' : 'Sign in'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(undefined);
                      passwordForm.clearErrors();
                    }}
                    disabled={passwordLoading}
                  >
                    {isSignUp 
                      ? 'Already have an account? Sign in' 
                      : "Don't have an account? Sign up"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>Tip: Press</span>
          <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">
            Enter
          </kbd>
          <span>to submit</span>
        </div>
      </div>
    </AuthLayout>
  );
}
