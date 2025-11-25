'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useSupabaseClient } from '@/lib/auth/hooks';

interface UseSupabaseSessionResult {
  user: User | null;
  loading: boolean;
}

/**
 * Hook to manage Supabase authentication session
 * Uses singleton Supabase client via useSupabaseClient
 */
export function useSupabaseSession(): UseSupabaseSessionResult {
  const supabase = useSupabaseClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    user,
    loading,
  };
}

