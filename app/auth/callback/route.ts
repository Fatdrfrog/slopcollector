import { type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Auth Callback Handler
 * Simplified for anonymous auth with Supabase credentials
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';

  const supabase = await getServerClient();

  try {
    // Verify session exists
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error('Auth callback error:', error);
      redirect('/login');
    }
    
    redirect(next);
  } catch (error) {
    console.error('Auth callback error:', error);
    redirect('/login');
  }
}

