import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { introspectSupabaseProject } from '@/lib/supabase/introspect';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body.projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

    // Get project credentials
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

    // Introspect the user's Supabase project
    console.log(`Introspecting project: ${project.project_name}`);
    const schema = await introspectSupabaseProject(
      project.supabase_url,
      project.supabase_anon_key
    );

    if (!schema || schema.tables.length === 0) {
      return NextResponse.json(
        { error: 'No tables found in project. Make sure your schema has tables in the public schema.' },
        { status: 400 }
      );
    }

    console.log(`Found ${schema.tables.length} tables, ${schema.columns.length} columns, ${schema.indexes.length} indexes`);

    // Store schema snapshot
    const { data: snapshot, error: snapshotError } = await serviceClient
      .from('schema_snapshots')
      .insert({
        project_id: project.id,
        tables_data: schema.tables,
        indexes_data: schema.indexes,
        relationships_data: [], // Will implement later
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (snapshotError) {
      console.error('Snapshot error:', snapshotError);
      return NextResponse.json(
        { error: 'Failed to save schema snapshot', details: snapshotError.message },
        { status: 500 }
      );
    }

    // Update project's last_synced_at
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
      message: `Synced ${schema.tables.length} tables successfully`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync project', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

