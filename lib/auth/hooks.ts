import { useMemo } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Singleton pattern: Single hook for Supabase client
 * DRY: Prevents multiple client instantiations
 */
export function useSupabaseClient() {
  return useMemo(() => getBrowserClient(), []);
}

