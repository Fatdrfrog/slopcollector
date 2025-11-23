import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle OAuth callback redirects and authentication state redirects
 */
export function useAuthRedirect(user: any, authLoading: boolean) {
  const router = useRouter();
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Handle OAuth callback codes that land on homepage (redirect to proper callback)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // OAuth code landed on homepage - redirect to proper callback
      setIsProcessingCallback(true);
      const next = urlParams.get('next') || '/';

      // Use replace to avoid adding to history stack
      window.location.replace(`/auth/callback?code=${code}&next=${encodeURIComponent(next)}`);
      return;
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    // Ignore if we are handling an OAuth callback
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
