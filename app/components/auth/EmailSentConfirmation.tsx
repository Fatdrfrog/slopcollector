import { Check, Mail } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import Link from 'next/link';

interface EmailSentConfirmationProps {
  type?: 'magic-link' | 'reset' | 'confirmation';
  onBack?: () => void;
}

/**
 * Singleton pattern: Reusable email confirmation screen
 * DRY: Single component for all email-sent states
 */
export function EmailSentConfirmation({ 
  type = 'magic-link',
  onBack 
}: EmailSentConfirmationProps) {
  const content = {
    'magic-link': {
      icon: Check,
      title: 'Check your email',
      message: "We've sent you a magic link. Click the link in your email to sign in instantly.",
    },
    'reset': {
      icon: Mail,
      title: 'Check your email',
      message: "We've sent you a password reset link. Click the link in your email to reset your password.",
    },
    'confirmation': {
      icon: Check,
      title: 'Check your email',
      message: "We've sent you a confirmation email. Click the link to verify your account.",
    },
  };

  const { icon: Icon, title, message } = content[type];

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center mb-4 w-16 h-16 bg-[#7ed321]/20 rounded-lg border border-[#7ed321]/30">
        <Icon className="w-8 h-8 text-[#7ed321]" />
      </div>
      <h1 className="text-2xl font-bold font-mono text-white mb-2">
        {title}
      </h1>
      <p className="text-[#999] font-mono text-sm mb-6">
        {message}
      </p>
      <div className="bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 rounded-lg p-3 mb-6">
        <p className="text-xs text-[#4ecdc4] font-mono">
          Link expires in 1 hour. Check spam if needed.
        </p>
      </div>
      {onBack && (
        <Button 
          variant="outline" 
          className="w-full bg-transparent border-[#3a3a3a] text-[#ccc] hover:bg-[#3a3a3a] hover:text-white font-mono" 
          onClick={onBack}
        >
          Back
        </Button>
      )}
    </div>
  );
}

