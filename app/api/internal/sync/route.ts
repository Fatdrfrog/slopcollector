import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { introspectSupabaseProject } from '@/lib/supabase/introspect';
import { createUnauthorizedResponse, createBadRequestResponse, createNotFoundResponse, createInternalErrorResponse } from '@/lib/utils/api-errors';

interface SyncRequestBody {
  projectId: string;
}

/**
 * Sync schema from user's connected Supabase project
 * Fetches tables, columns, indexes and stores snapshot
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncRequestBody;
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

    const serviceClient = getServiceClient();

    const { data: project, error: projectError } = await serviceClient
      .from('connected_projects')
      .select('*')
      .eq('id', body.projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return createNotFoundResponse('Project not found or access denied');
    }
    
    const schema = await introspectSupabaseProject(
      project.supabase_url,
      project.supabase_anon_key
    );

    if (!schema || schema.tables.length === 0) {
      return createBadRequestResponse('No tables found. Make sure your Supabase project has tables in the public schema.');
    }

    const { data: snapshot, error: snapshotError } = await serviceClient
      .from('schema_snapshots')
      .insert({
        project_id: project.id,
        tables_data: schema.tables,
        columns_data: schema.columns,
        indexes_data: schema.indexes,
        relationships_data: [], // WIP: Will implement later
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (snapshotError) {
      console.error('Snapshot error:', snapshotError);
      return createInternalErrorResponse('Failed to save schema snapshot', snapshotError.message);
    }

    await serviceClient
      .from('connected_projects')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', project.id);

    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      tables: schema.tables.length,
      columns: schema.columns.length,
      indexes: schema.indexes.length,
      message: `Synced ${schema.tables.length} tables with ${schema.columns.length} columns`,
      debug: {
        tablesStored: schema.tables.length,
        columnsStored: schema.columns.length,
        sampleTable: schema.tables[0]?.tableName,
        sampleColumns: schema.columns.slice(0, 3).map(c => `${c.tableName}.${c.columnName}`),
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return createInternalErrorResponse(
      'Failed to sync project',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

