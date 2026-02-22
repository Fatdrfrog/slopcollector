'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Get or create the singleton browser Supabase client
 * Use this in Client Components and hooks
 * 
 * Uses publishable key (sb_publishable_...) or legacy anon key
 */
export function getBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }
  return browserClient;
}
