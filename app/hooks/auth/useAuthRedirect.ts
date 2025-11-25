import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export function useAuthRedirect(user: User | null, authLoading: boolean) {
  const router = useRouter();
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setIsProcessingCallback(true);
      const next = urlParams.get('next') || '/';

      window.location.replace(`/auth/callback?code=${code}&next=${encodeURIComponent(next)}`);
      return;
    }
  }, []);

  useEffect(() => {
    if (isProcessingCallback) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code')) return;
    }

    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router, isProcessingCallback]);

  return { isProcessingCallback };
}
