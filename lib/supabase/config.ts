/**
 * Shared Supabase configuration
 * Validates and caches environment variables
 * 
 * Supports both new API keys (publishable/secret) and legacy keys (anon/service_role)
 * New keys are preferred, legacy keys are fallback for backward compatibility
 * 
 * @see https://github.com/orgs/supabase/discussions/29260
 */

let cachedConfig: {
  url: string;
  publishableKey: string;
} | null = null;

export function getSupabaseConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Prefer new publishable key, fallback to legacy anon key
  const publishableKey = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and ' +
      '(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }

  cachedConfig = { url, publishableKey };
  return cachedConfig;
}

let cachedServiceConfig: {
  url: string;
  secretKey: string;
} | null = null;

export function getSupabaseServiceConfig() {
  if (cachedServiceConfig) {
    return cachedServiceConfig;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Prefer new secret key, fallback to legacy service_role key
  const secretKey = 
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing SUPABASE_URL and ' +
      '(SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  cachedServiceConfig = { url, secretKey };
  return cachedServiceConfig;
}
