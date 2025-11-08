/**
 * Auth utility functions following DRY principle
 * Single source of truth for common auth operations
 */

/**
 * Get auth redirect URL for callbacks
 */
export function getAuthCallbackUrl(path: string = '/auth/callback'): string {
  return `${window.location.origin}${path}`;
}

/**
 * Format auth error messages for better UX
 */
export function formatAuthError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    // Improve Supabase error messages
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account before signing in.';
    }
    if (error.message.includes('User already registered')) {
      return 'This email is already registered. Try signing in instead.';
    }
    return error.message;
  }
  return fallback;
}

/**
 * Validate email format (client-side helper)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

