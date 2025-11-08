import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const supabase = await getServerClient();

  try {
    // Handle magic link / email verification via OTP
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      
      if (error) {
        console.error('OTP verification error:', error);
        redirect(`/auth/error?message=${encodeURIComponent(error.message)}`);
      }
      
      redirect(next);
    }
    
    // Handle OAuth / PKCE flow
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Code exchange error:', error);
        redirect(`/auth/error?message=${encodeURIComponent(error.message)}`);
      }
      
      redirect(next);
    }

    // No valid authentication parameters
    redirect('/auth/error?message=Invalid authentication link');
  } catch (error) {
    console.error('Auth callback error:', error);
    redirect('/auth/error?message=An unexpected error occurred');
  }
}

