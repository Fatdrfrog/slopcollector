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

  // Generate AI advice in background
  // For now, we'll do it synchronously, but could move to edge function or queue
  try {
    await generateAIAdvice(serviceClient, project.id, job.id);
    
    return NextResponse.json({
      jobId: job.id,
      status: 'completed',
      message: 'AI advice generated successfully',
    });
  } catch (adviceError) {
    console.error('AI advice generation error:', adviceError);
    
    // Update job status to failed
    await serviceClient
      .from('analysis_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: adviceError instanceof Error ? adviceError.message : 'Unknown error',
      })
      .eq('id', job.id);
    
    return NextResponse.json(
      {
        error: 'Failed to generate AI advice',
        details: adviceError instanceof Error ? adviceError.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate AI-powered index suggestions using OpenAI
 */
async function generateAIAdvice(
  serviceClient: SupabaseClient,
  projectId: string,
  jobId: string
) {
  const { generateAdviceForSchema } = await import('@/lib/ai/generateAdvice');
  
  // Get latest schema snapshot
  const { data: snapshot } = await serviceClient
    .from('schema_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!snapshot) {
    throw new Error('No schema snapshot found. Please sync your project first.');
  }

  // Generate AI suggestions
  const suggestions = await generateAdviceForSchema({
    tables: snapshot.tables_data as any[],
    indexes: snapshot.indexes_data as any[],
  });

  // Store suggestions in database
  const suggestionRows = suggestions.map(s => ({
    project_id: projectId,
    table_name: s.tableName,
    column_name: s.columnName || null,
    severity: s.severity,
    suggestion_type: s.type,
    title: s.title,
    description: s.description,
    sql_snippet: s.sqlSnippet || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  }));

  if (suggestionRows.length > 0) {
    await serviceClient
      .from('optimization_suggestions')
      .insert(suggestionRows);
  }

  // Update job status
  await serviceClient
    .from('analysis_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: { suggestions: suggestions.length },
    })
    .eq('id', jobId);
}

