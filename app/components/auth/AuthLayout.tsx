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
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] p-4">
      <div className="w-full max-w-md bg-[#2a2a2a] rounded-lg shadow-2xl p-8 border border-[#3a3a3a]">
        {children}
      </div>
    </div>
  );
}

