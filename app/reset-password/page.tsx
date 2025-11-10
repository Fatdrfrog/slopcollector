'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useSupabaseClient, authToasts } from '@/lib/auth';
import { PasswordInput, PasswordStrength } from '@/app/components/auth';
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
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

// Request Reset Schema
const requestResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Confirm Reset Schema
const confirmResetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RequestResetFormValues = z.infer<typeof requestResetSchema>;
type ConfirmResetFormValues = z.infer<typeof confirmResetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [emailSent, setEmailSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  // Check if this is a password recovery link (has access token)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsRecovery(true);
    }
  }, []);

  const requestForm = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
  });

  const confirmForm = useForm<ConfirmResetFormValues>({
    resolver: zodResolver(confirmResetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleRequestReset = async (values: RequestResetFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setEmailSent(true);
      authToasts.emailSent();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (values: ConfirmResetFormValues) => {
    setLoading(true);
    setError(undefined);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) {
        throw updateError;
      }

      setResetComplete(true);
      authToasts.signInSuccess();
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      authToasts.authError(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show success message after reset complete
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a] text-center"
        >
          <div className="w-16 h-16 bg-[#7ed321]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#7ed321]" />
          </div>
          <h2 className="text-2xl font-mono font-bold text-white mb-2">
            Password Updated!
          </h2>
          <p className="text-[#999] font-mono text-sm mb-6">
            Your password has been successfully reset. Redirecting to dashboard...
          </p>
          <div className="animate-pulse">
            <Loader2 className="w-6 h-6 text-[#7ed321] animate-spin mx-auto" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Show email sent confirmation
  if (emailSent && !isRecovery) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a] text-center"
        >
          <div className="w-16 h-16 bg-[#4ecdc4]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#4ecdc4]" />
          </div>
          <h2 className="text-2xl font-mono font-bold text-white mb-2">
            Check Your Email
          </h2>
          <p className="text-[#999] font-mono text-sm mb-6">
            We've sent a password reset link to <strong className="text-white">{requestForm.getValues('email')}</strong>
          </p>
          <p className="text-[#666] font-mono text-xs mb-6">
            Click the link in the email to reset your password. The link expires in 1 hour.
          </p>
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono hover:bg-[#2a2a2a] hover:border-[#7ed321]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a]"
      >
        <div className="mb-6">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-[#4ecdc4] hover:text-[#3dbdb5] font-mono hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
          <h1 className="text-3xl font-mono font-bold text-white mb-2">
            {isRecovery ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-sm text-[#999] font-mono">
            {isRecovery
              ? 'Enter your new password below'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert variant="destructive" className="bg-[#ff6b6b]/10 border-[#ff6b6b]">
              <AlertDescription className="text-[#ff6b6b] font-mono text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {isRecovery ? (
          // Confirm Reset Form (from email link)
          <Form {...confirmForm}>
            <form onSubmit={confirmForm.handleSubmit(handleConfirmReset)} className="space-y-4">
              <FormField
                control={confirmForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#ccc] font-mono text-sm">
                      New Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Create a strong password"
                        disabled={loading}
                        autoComplete="new-password"
                        className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
                      />
                    </FormControl>
                    <PasswordStrength password={field.value} />
                    <FormMessage className="text-[#ff6b6b] font-mono text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={confirmForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#ccc] font-mono text-sm">
                      Confirm New Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Confirm your password"
                        disabled={loading}
                        autoComplete="new-password"
                        className="bg-[#1a1a1a] border-[#3a3a3a] text-white font-mono placeholder:text-[#666] focus:border-[#7ed321] focus:ring-[#7ed321]"
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
                    Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </Form>
        ) : (
          // Request Reset Form
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

              <Button
                type="submit"
                className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending email...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </Form>
        )}
      </motion.div>
    </div>
  );
}

