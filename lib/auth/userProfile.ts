import type { User } from '@supabase/supabase-js';

/**
 * User profile utilities for managing user data
 */

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
}

/**
 * Extract user profile from Supabase user object
 */
export function getUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email!,
    created_at: user.created_at,
    full_name: user.user_metadata?.full_name,
    avatar_url: user.user_metadata?.avatar_url,
  };
}

/**
 * Get initials from user name or email
 */
export function getUserInitials(user: User): string {
  const fullName = user.user_metadata?.full_name;
  
  if (fullName) {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
  
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Format user display name
 */
export function getUserDisplayName(user: User): string {
  return user.user_metadata?.full_name || user.email || 'User';
}

