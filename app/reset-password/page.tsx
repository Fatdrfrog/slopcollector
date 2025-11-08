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
          <div className="inline-flex items-center justify-center mb-4 w-16 h-16 bg-green-100 rounded-full">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Password reset successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Your password has been updated. Redirecting you to login...
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
            <div className="w-16 h-16 bg-linear-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Set new password
          </h1>
          <p className="text-gray-600">
            Choose a strong password for your account
          </p>
        </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={loading}
                        {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={resetForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <PasswordStrength password={field.value} className="mt-2" />
                </FormItem>
              )}
            />

            <FormField
              control={resetForm.control}
              name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={loading}
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>
          </Form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <BrandHeader showLogo={false} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Reset your password
        </h1>
        <p className="text-gray-600">
          Enter your email and we'll send you a reset link
        </p>
      </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...requestForm}>
          <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
            <FormField
              control={requestForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={loading}
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send reset link
                </>
              )}
            </Button>

            <div className="text-center">
              <Link href="/login">
                <Button variant="ghost" className="w-full text-sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Button>
              </Link>
            </div>
          </form>
        </Form>
    </AuthLayout>
  );
}

