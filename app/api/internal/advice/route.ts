import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { getServerClient } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createBadRequestResponse, createNotFoundResponse } from '@/lib/utils/api-errors';

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const workerUrl = `${appUrl}/api/workers/advice`;

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev || appUrl.includes('localhost')) {
      try {        
        const { generateAIAdviceForProject, storeAdviceSuggestions } = await import('@/lib/ai/adviceService');
        
        (async () => {
          try {
             const result = await generateAIAdviceForProject(serviceClient, project.id, {
               projectName: project.project_name,
               skipRecentCheck: true,
             });
             
             const { data: snapshot } = await serviceClient
              .from('schema_snapshots')
              .select('id, tables_data, columns_data, indexes_data')
              .eq('project_id', project.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

             if (snapshot) {
                const storeResult = await storeAdviceSuggestions(
                  serviceClient,
                  project.id,
                  snapshot.id,
                  result.suggestions,
                  {
                    schemaSnapshot: {
                      tables: (snapshot.tables_data as any[]) || [],
                      columns: (snapshot.columns_data as any[]) || [],
                      indexes: (snapshot.indexes_data as any[]) || [],
                    },
                  }
                );
                
                await serviceClient
                  .from('analysis_jobs')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    result_data: {
                      summary: result.summary,
                      stats: result.stats,
                      ...storeResult,
                    },
                    suggestions_count: storeResult.newSuggestions,
                  })
                  .eq('id', job.id);
                  

                 // Trigger Supabase Realtime Broadcast (mocking the worker)
                 const channel = serviceClient.channel(`project-${project.id}`);
                 await channel.subscribe();
                 await channel.send({
                   type: 'broadcast',
                   event: 'advice-completed',
                   payload: {
                     jobId: job.id,
                     result: storeResult,
                     summary: result.summary,
                   },
                 });
                 serviceClient.removeChannel(channel);

             }
          } catch (err) {
            console.error('[Dev] Local advice generation failed:', err);
             await serviceClient
              .from('analysis_jobs')
              .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                error_message: err instanceof Error ? err.message : 'Local execution failed',
              })
              .eq('id', job.id);

              const channel = serviceClient.channel(`project-${project.id}`);
              await channel.subscribe();
              await channel.send({
                type: 'broadcast',
                event: 'advice-failed',
                payload: {
                  jobId: job.id,
                  error: err instanceof Error ? err.message : 'Unknown error',
                },
              });
              serviceClient.removeChannel(channel);
          }
        })();

      } catch (e) {
        console.error('[Dev] Failed to run local logic:', e);
      }
    } else {
      await qstashClient.publishJSON({
        url: workerUrl,
        body: {
          projectId: project.id,
          jobId: job.id,
          projectName: project.project_name,
        },
      });
    }
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

