import { Check, Mail } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

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
      <div className="inline-flex items-center justify-center mb-4 w-16 h-16 bg-green-100 rounded-full">
        <Icon className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {title}
      </h1>
      <p className="text-gray-600 mb-6">
        {message}
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Pro tip:</strong> The link expires in 1 hour. If you don't see it, check your spam folder.
        </p>
      </div>
      {onBack && (
        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
      )}
    </div>
  );
}

