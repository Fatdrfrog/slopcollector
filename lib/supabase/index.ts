/**
 * Supabase client exports
 * 
 * Usage:
 * - Browser: import { getBrowserClient } from '@/lib/supabase'
 * - Server: import { getServerClient } from '@/lib/supabase'
 * - Service: import { getServiceClient } from '@/lib/supabase'
 */

export { getBrowserClient } from './client';
export { getServerClient } from './server';
export { getServiceClient } from './serviceClient';
export { updateSession } from './middleware';
export { getSupabaseConfig, getSupabaseServiceConfig } from './config';
export { getStorageUrl, videoUrls } from './storage';

