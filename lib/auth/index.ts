/**
 * Auth Utilities - Centralized exports
 * DRY: Single import point for all auth utilities
 */

export { useSupabaseClient } from './hooks';
export { getUserProfile, getUserInitials, getUserDisplayName } from './userProfile';
export { getAuthCallbackUrl, formatAuthError, isValidEmail } from './utils';
export { authToasts } from './toast';

