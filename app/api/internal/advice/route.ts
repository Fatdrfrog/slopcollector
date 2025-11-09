import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUsageEntitlement } from '@/lib/commerce/stripe';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { getServerClient } from '@/lib/supabase/server';

interface AdviceRequestBody {
  projectId?: string;
  async?: boolean;
}

/**
 * Generate AI advice for a connected project
 * Simplified for credential-based auth
 */
export async function POST(request: Request) {
  const body = (await request.json()) as AdviceRequestBody;
  const supabase = await getServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!body.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  // Verify user owns this project
  const { data: project, error: projectError } = await serviceClient
    .from('connected_projects')
    .select('*')
    .eq('id', body.projectId)
    .eq('user_id', user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found or access denied' },
      { status: 404 }
    );
  }

  // Check usage limits (free tier by default, Stripe optional)
  const entitlement = getUsageEntitlement();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count: jobCount } = await serviceClient
    .from('analysis_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .eq('job_type', 'ai_advice')
    .gte('created_at', since);

  if (typeof jobCount === 'number' && jobCount >= entitlement.aiRunsPerDay) {
    return NextResponse.json(
      {
        error: 'Daily AI advice quota reached',
        allowed: entitlement.aiRunsPerDay,
        message: 'Try again tomorrow or upgrade to Pro',
      },
      { status: 429 }
    );
  }

  // Create analysis job
  const { data: job, error: jobError } = await serviceClient
    .from('analysis_jobs')
    .insert({
      project_id: project.id,
      job_type: 'ai_advice',
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { error: 'Failed to create analysis job', details: jobError?.message },
      { status: 500 }
    );
  }

  // TODO: Implement AI advice generation
  // For now, return job created
  return NextResponse.json({
    jobId: job.id,
    status: 'pending',
    message: 'AI advice generation will be implemented soon',
  });
}

