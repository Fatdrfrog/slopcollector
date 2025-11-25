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
    const { generateAIAdviceForProject, storeAdviceSuggestions } = await import('@/lib/ai/adviceService');
    
    const result = await generateAIAdviceForProject(serviceClient, project.id, {
      projectName: project.project_name || undefined,
      skipRecentCheck: false,
    });

    const { data: snapshot } = await serviceClient
      .from('schema_snapshots')
      .select('id, tables_data, columns_data, indexes_data')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!snapshot) {
      throw new Error('No schema snapshot found');
    }

    const storeResult = await storeAdviceSuggestions(
      serviceClient,
      project.id,
      snapshot.id,
      result.suggestions,
      {
        schemaSnapshot: {
          tables: (snapshot.tables_data as TableSchema[]) || [],
          columns: (snapshot.columns_data as ColumnSchema[]) || [],
          indexes: (snapshot.indexes_data as IndexSchema[]) || [],
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
    
    return NextResponse.json({
      jobId: job.id,
      status: 'completed',
      message: 'AI advice generated successfully',
      result: storeResult,
    });
  } catch (adviceError) {
    console.error('AI advice generation error:', adviceError);
    
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

