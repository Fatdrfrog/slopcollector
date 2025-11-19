import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Auth callback handler for OAuth and email verification
 * Handles redirects from Supabase auth flows
 * 
 * Supports:
 * - OAuth (Google, GitHub)
 * - Email verification links
 * - Password reset confirmations
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth/email verification errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || error)}`,
        requestUrl.origin
      )
    );
  }

  if (code) {
    const supabase = await getServerClient();

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(exchangeError.message)}`,
          requestUrl.origin
        )
      );
    }

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check if user profile exists, create if not
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        // Store GitHub access token if available (for GitHub OAuth)
        const githubAccessToken = user.app_metadata?.provider_token;
        
        const { error: insertError } = await supabase.from('user_profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });

        if (insertError) {
          console.error('Failed to create user profile:', insertError);
        }
        
        // Store GitHub token separately if needed for future use
        if (githubAccessToken && user.app_metadata?.provider === 'github') {
          // You could store this in user_profiles or a separate table
          console.log('GitHub OAuth: User authenticated with repo access');
        }
      }

      // Successful authentication - redirect to next path
      const forwardedHost = request.headers.get('x-forwarded-host');
      const forwardedProto = request.headers.get('x-forwarded-proto');

      if (forwardedHost) {
        const protocol = forwardedProto || 'https';
        return NextResponse.redirect(`${protocol}://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    }
  }

  // No code or user, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

