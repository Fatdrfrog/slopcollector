'use client';

import { useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { BrandHeader } from '@/app/components/auth/BrandHeader';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'Connection failed';

  return (
    <AuthLayout>
      <BrandHeader subtitle="Connection Error" />

      <Alert variant="destructive" className="mb-6 bg-[#ff6b6b]/10 border-[#ff6b6b]">
        <AlertCircle className="h-4 w-4 text-[#ff6b6b]" />
        <AlertTitle className="text-[#ff6b6b] font-mono">Error</AlertTitle>
        <AlertDescription className="mt-2 text-[#ff6b6b] font-mono text-sm">
          {message}
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Link href="/login" className="block">
          <Button className="w-full bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Link>
        
        <div className="text-xs text-[#666] text-center font-mono">
          <p>Check your Supabase URL & API key</p>
        </div>
      </div>
    </AuthLayout>
  );
}

