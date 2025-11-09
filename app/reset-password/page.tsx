'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
} from '@/app/components/ui/form';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Loader2, Mail, Check, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

const requestResetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RequestResetFormValues = z.infer<typeof requestResetSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [emailSent, setEmailSent] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  const hasAccessToken = searchParams.get('access_token') !== null;

  const requestForm = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleRequestReset = async (values: RequestResetFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: getAuthCallbackUrl('/reset-password'),
      });

      if (error) throw error;
      authToasts.passwordResetSent(values.email);
      setEmailSent(true);
      setTimeout(() => authToasts.checkSpam(), 3000);
    } catch (err) {
      const errorMessage = formatAuthError(err, 'Failed to send reset email');
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) throw error;
      authToasts.passwordResetSuccess();
      setPasswordReset(true);
      
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const errorMessage = formatAuthError(err, 'Failed to reset password');
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (passwordReset) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4 w-16 h-16 bg-[#7ed321]/20 rounded-lg border border-[#7ed321]/30">
            <Check className="w-8 h-8 text-[#7ed321]" />
          </div>
          <h1 className="text-2xl font-bold font-mono text-white mb-2">
            Password Reset!
          </h1>
          <p className="text-[#999] font-mono text-sm mb-6">
            Redirecting...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (emailSent) {
    return (
      <AuthLayout>
        <EmailSentConfirmation type="reset" />
        <Link href="/login">
          <Button variant="outline" className="w-full mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  if (hasAccessToken) {
    return (
      <AuthLayout>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-[#2a2a2a] border-2 border-[#7ed321] rounded-lg flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#7ed321]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-mono text-white mb-2">
            Set New Password
          </h1>
          <p className="text-[#999] font-mono text-sm">
            Choose a strong password
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-[#ff6b6b]/10 border-[#ff6b6b]">
            <AlertDescription className="text-[#ff6b6b] font-mono text-sm">{error}</AlertDescription>
          </Alert>
        )}

          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#ccc] font-mono text-sm">New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={loading}
                        className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                        {...field}
                      />
                    </FormControl>
                    <PasswordStrength password={field.value} className="mt-2" />
                    <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#ccc] font-mono text-sm">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={loading}
                        className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </Form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <BrandHeader subtitle="Reset your password" />

      {error && (
        <Alert variant="destructive" className="mb-4 bg-[#ff6b6b]/10 border-[#ff6b6b]">
          <AlertDescription className="text-[#ff6b6b] font-mono text-sm">{error}</AlertDescription>
        </Alert>
      )}

        <Form {...requestForm}>
          <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
            <FormField
              control={requestForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#ccc] font-mono text-sm">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="dev@company.com"
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

            <Button
              type="submit"
              className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>

            <div className="text-center">
              <Link href="/login">
                <Button variant="ghost" className="w-full text-sm text-[#999] hover:text-white hover:bg-[#3a3a3a] font-mono">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
          </form>
        </Form>
    </AuthLayout>
  );
}

