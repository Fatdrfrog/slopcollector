import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to check environment configuration
 * GET /api/internal/diagnostics
 * 
 * Helps debug why suggestions don't appear on deployed project
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {} as Record<string, { status: 'ok' | 'error'; message: string }>,
  };

  // Check 1: Public Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  diagnostics.checks.supabaseUrl = supabaseUrl
    ? { status: 'ok', message: `Set: ${supabaseUrl}` }
    : { status: 'error', message: 'Missing NEXT_PUBLIC_SUPABASE_URL' };

  // Check 2: Anon Key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  diagnostics.checks.anonKey = anonKey
    ? { status: 'ok', message: `Set: ${anonKey.substring(0, 20)}...` }
    : { status: 'error', message: 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY' };

  // Check 3: Service Role Key (CRITICAL for AI advice storage)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  diagnostics.checks.serviceRoleKey = serviceKey
    ? { status: 'ok', message: `Set: ${serviceKey.substring(0, 20)}...` }
    : { status: 'error', message: '❌ MISSING SUPABASE_SERVICE_ROLE_KEY - AI suggestions cannot be stored!' };

  // Check 4: OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY;
  diagnostics.checks.openaiKey = openaiKey
    ? { status: 'ok', message: `Set: ${openaiKey.substring(0, 15)}...` }
    : { status: 'error', message: 'Missing OPENAI_API_KEY' };

  // Check 5: Cron Secret
  const cronSecret = process.env.CRON_SECRET;
  diagnostics.checks.cronSecret = cronSecret
    ? { status: 'ok', message: 'Set' }
    : { status: 'error', message: 'Missing CRON_SECRET (optional for cron jobs)' };

  // Check 6: Database connection
  try {
    const supabase = await getServerClient();
    const { data, error } = await supabase
      .from('connected_projects')
      .select('count', { count: 'exact', head: true });

    diagnostics.checks.databaseConnection = !error
      ? { status: 'ok', message: `Connected. ${data || 0} projects found` }
      : { status: 'error', message: `Connection failed: ${error.message}` };
  } catch (err) {
    diagnostics.checks.databaseConnection = {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown connection error',
    };
  }

  // Check 7: Service Client (RLS bypass)
  try {
    const { getServiceClient } = await import('@/lib/supabase/serviceClient');
    const serviceClient = getServiceClient();
    
    const { data, error } = await serviceClient
      .from('optimization_suggestions')
      .select('count', { count: 'exact', head: true });

    diagnostics.checks.serviceClient = !error
      ? { status: 'ok', message: `Service client working. ${data || 0} suggestions in DB` }
      : { status: 'error', message: `Service client failed: ${error.message}` };
  } catch (err) {
    diagnostics.checks.serviceClient = {
      status: 'error',
      message: err instanceof Error ? err.message : 'Service client initialization failed',
    };
  }

  // Overall status
  const hasErrors = Object.values(diagnostics.checks).some((check) => check.status === 'error');
  const criticalError = !serviceKey; // Service key is critical

  return NextResponse.json({
    ...diagnostics,
    overallStatus: criticalError ? 'CRITICAL' : hasErrors ? 'WARNING' : 'HEALTHY',
    recommendation: criticalError
      ? '⚠️ Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables and redeploy'
      : hasErrors
      ? 'Some optional environment variables are missing'
      : '✅ All systems operational',
  });
}

