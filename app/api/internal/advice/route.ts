import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { getServerClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createBadRequestResponse, createNotFoundResponse } from '@/lib/utils/api-errors';
import { ColumnSchema, IndexSchema, TableSchema } from '@/lib/types';

interface AdviceRequestBody {
  projectId?: string;
  async?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as AdviceRequestBody;
  const supabase = await getServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedResponse();
  }

  if (!body.projectId) {
    return createBadRequestResponse('Project ID required');
  }

  let serviceClient;
  try {
    serviceClient = getServiceClient();
  } catch (error) {
    console.error('Service client initialization failed:', error);
    return NextResponse.json(
      {
        error: 'Server configuration error',
        details: 'Service role key not configured. Contact administrator.',
        hint: 'Check SUPABASE_SERVICE_ROLE_KEY environment variable',
      },
      { status: 500 }
    );
  }

  const { data: project, error: projectError } = await serviceClient
    .from('connected_projects')
    .select('*')
    .eq('id', body.projectId)
    .eq('user_id', user.id)
    .single();

  if (projectError || !project) {
    return createNotFoundResponse('Project not found or access denied');
  }

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

  try {
    const { qstashClient } = await import('@/lib/upstash');

    // Construct the URL for the worker
    // Assuming the app is deployed and accessible via a public URL or configured QStash URL
    // For local dev with ngrok/tunnel, this needs to be the public URL
    // For production, it's the production URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const workerUrl = `${appUrl}/api/workers/advice`;

    await qstashClient.publishJSON({
      url: workerUrl,
      body: {
        projectId: project.id,
        jobId: job.id,
        projectName: project.project_name,
      },
    });
    
    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      message: 'AI advice generation queued',
    });
  } catch (error) {
    console.error('Failed to queue advice generation:', error);
    
    await serviceClient
      .from('analysis_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Failed to queue job',
      })
      .eq('id', job.id);
    
    return NextResponse.json(
      {
        error: 'Failed to queue AI advice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

