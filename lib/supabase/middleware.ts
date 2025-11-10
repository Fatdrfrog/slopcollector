import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig } from './config';

/**
 * Middleware helper to refresh Supabase auth session
 * Called by middleware.ts on each request
 * 
 * Uses publishable key (sb_publishable_...) or legacy anon key
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const config = getSupabaseConfig();
  if (!config) {
    return supabaseResponse;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it unsafe for users.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  // Except for public routes: /login, /signup, /reset-password, /auth/*
  const publicRoutes = ['/login', '/signup', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  ) || request.nextUrl.pathname.startsWith('/auth/');
  
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    // Preserve the current path to return after login
    const returnTo = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
