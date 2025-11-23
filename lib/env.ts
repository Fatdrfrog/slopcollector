import { getSupabaseConfig, getSupabaseServiceConfig } from './supabase/config';

interface ServerEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  openaiApiKey?: string;
}

export function getServerEnv(): ServerEnv {
  const { url: supabaseUrl, publishableKey: supabasePublishableKey } = getSupabaseConfig();
  const { secretKey: supabaseSecretKey } = getSupabaseServiceConfig();

  return {
    supabaseUrl,
    supabasePublishableKey,
    supabaseSecretKey,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}

