import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Singleton pattern: Shared layout for all auth pages
 * Prevents repetition of background and container styles
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-100 via-purple-100 to-cyan-100 p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/60">
        {children}
      </div>
    </div>
  );
}

