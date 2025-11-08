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
 */
export function getServiceClient(): SupabaseClient {
  if (!globalCache.__serviceSupabaseClient) {
    const { url, secretKey } = getSupabaseServiceConfig();
    globalCache.__serviceSupabaseClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return globalCache.__serviceSupabaseClient;
}
