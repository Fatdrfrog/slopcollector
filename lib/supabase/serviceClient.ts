import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceConfig } from './config';

const globalCache = globalThis as unknown as {
  __serviceSupabaseClient?: SupabaseClient;
};

/**
 * Get or create the singleton service role Supabase client
 * Use this for admin operations that bypass RLS
 * 
 * WARNING: This client has full database access - use with caution!
 * Uses secret key (sb_secret_...) or legacy service_role key
 * 
 * DEPLOYMENT NOTE: Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel env vars!
 * Without this, AI suggestions cannot be stored (RLS will block inserts).
 */
export function getServiceClient(): SupabaseClient {
  if (!globalCache.__serviceSupabaseClient) {
    try {
      const { url, secretKey } = getSupabaseServiceConfig();
      globalCache.__serviceSupabaseClient = createClient(url, secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('✅ Service client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize service client:', error);
      throw new Error(
        'Service client initialization failed. Check SUPABASE_SERVICE_ROLE_KEY environment variable.'
      );
    }
  }
  return globalCache.__serviceSupabaseClient;
}
