import { toast } from 'sonner';

/**
 * Auth Toast Notifications (Simplified)
 * For Supabase credential-based auth
 */

export const authToasts = {
  connectionSuccess: () => {
    toast.success('Connected!', {
      description: 'Supabase credentials verified successfully.',
      duration: 2000,
    });
  },

  signInSuccess: () => {
    toast.success('Welcome! 🦝', {
      description: 'Loading your database schema...',
      duration: 2000,
    });
  },

  signOutSuccess: () => {
    toast.success('Disconnected', {
      description: 'Your session has been ended.',
      duration: 3000,
    });
  },

  authError: (message: string) => {
    toast.error('Connection failed', {
      description: message,
      duration: 5000,
    });
  },

  invalidCredentials: () => {
    toast.error('Invalid credentials', {
      description: 'Check your Supabase URL and API key.',
      duration: 4000,
    });
  },

  emailSent: () => {
    toast.success('Email sent!', {
      description: 'Check your inbox for a verification link.',
      duration: 4000,
    });
  },
};

