import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { ColumnSchema, IndexSchema, TableSchema } from '@/lib/types';

async function handler(request: Request) {
  const body = await request.json();
  const { projectId, jobId, projectName } = body;

  if (!projectId || !jobId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  try {
    const { generateAIAdviceForProject, storeAdviceSuggestions } = await import('@/lib/ai/adviceService');

    const result = await generateAIAdviceForProject(serviceClient, projectId, {
      projectName: projectName || undefined,
      skipRecentCheck: true, 
    });
  
    const { data: snapshot } = await serviceClient
      .from('schema_snapshots')
      .select('id, tables_data, columns_data, indexes_data')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!snapshot) {
      throw new Error('No schema snapshot found');
    }

    const storeResult = await storeAdviceSuggestions(
      serviceClient,
      projectId,
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
      .eq('id', jobId);

    const channel = serviceClient.channel(`project-${projectId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'advice-completed',
      payload: {
        jobId,
        result: storeResult,
        summary: result.summary,
      },
    });
    serviceClient.removeChannel(channel);

    return NextResponse.json({ success: true });
  } catch (error) {
    await serviceClient
      .from('analysis_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId);
      
    const channel = serviceClient.channel(`project-${projectId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'advice-failed',
      payload: {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      serviceClient.removeChannel(channel);

    return NextResponse.json(
      { error: 'Worker failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
