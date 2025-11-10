'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Mail, X, Loader2 } from 'lucide-react';
import { useSupabaseClient, authToasts } from '@/lib/auth';

interface EmailVerificationBannerProps {
  userEmail: string;
}

/**
 * Banner prompting user to verify their email
 */
export function EmailVerificationBanner({ userEmail }: EmailVerificationBannerProps) {
  const supabase = useSupabaseClient();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) {
        authToasts.authError(error.message);
      } else {
        authToasts.emailSent();
      }
    } catch (err) {
      authToasts.authError('Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className="bg-[#4ecdc4]/10 border-[#4ecdc4]/30 relative">
          <Mail className="h-4 w-4 text-[#4ecdc4]" />
          <AlertDescription className="text-[#4ecdc4] font-mono text-sm pr-8">
            <div className="flex items-center justify-between">
              <span>
                Please verify your email: <strong>{userEmail}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resending}
                className="text-[#4ecdc4] hover:text-[#3dbdb5] hover:bg-[#4ecdc4]/20 font-mono"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend'
                )}
              </Button>
            </div>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-[#4ecdc4]/20"
          >
            <X className="h-3 w-3 text-[#4ecdc4]" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}

