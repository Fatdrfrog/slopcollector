import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceConfig } from './config';

const globalCache = globalThis as unknown as {
  __serviceSupabaseClient?: SupabaseClient;
};

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
    } catch (error) {
      console.error('❌ Failed to initialize service client:', error);
      throw new Error(
        'Service client initialization failed. Check SUPABASE_SERVICE_ROLE_KEY environment variable.'
      );
    }
  }
  return globalCache.__serviceSupabaseClient;
}
