import { toast } from 'sonner';

/**
 * Auth Toast Notifications
 * DRY: Centralized toast messages for auth operations
 * Singleton pattern: Consistent messaging across app
 */

export const authToasts = {
  /**
   * Success messages
   */
  magicLinkSent: (email: string) => {
    toast.success('Magic link sent!', {
      description: `Check ${email} for your sign-in link. It expires in 1 hour.`,
      duration: 6000,
    });
  },

  emailConfirmationSent: (email: string) => {
    toast.success('Check your email', {
      description: `We've sent a confirmation link to ${email}. Click it to verify your account.`,
      duration: 6000,
    });
  },

  passwordResetSent: (email: string) => {
    toast.success('Reset link sent!', {
      description: `Check ${email} for your password reset link.`,
      duration: 6000,
    });
  },

  passwordResetSuccess: () => {
    toast.success('Password updated!', {
      description: 'Your password has been successfully changed.',
      duration: 4000,
    });
  },

  signInSuccess: () => {
    toast.success('Welcome back!', {
      description: 'You have successfully signed in.',
      duration: 3000,
    });
  },

  signOutSuccess: () => {
    toast.success('Signed out', {
      description: 'You have been successfully signed out.',
      duration: 3000,
    });
  },

  /**
   * Error messages
   */
  authError: (message: string) => {
    toast.error('Authentication failed', {
      description: message,
      duration: 5000,
    });
  },

  invalidCredentials: () => {
    toast.error('Invalid credentials', {
      description: 'The email or password you entered is incorrect.',
      duration: 4000,
    });
  },

  emailNotConfirmed: () => {
    toast.error('Email not confirmed', {
      description: 'Please check your email and confirm your account first.',
      duration: 5000,
      action: {
        label: 'Resend',
        onClick: () => toast.info('Resend feature coming soon'),
      },
    });
  },

  /**
   * Info messages
   */
  checkSpam: () => {
    toast.info('Can\'t find the email?', {
      description: 'Check your spam folder or wait a few minutes.',
      duration: 4000,
    });
  },

  /**
   * Loading states
   */
  loading: (message: string) => {
    return toast.loading(message);
  },
};

