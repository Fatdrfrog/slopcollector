import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { introspectSupabaseProject } from '@/lib/supabase/introspect';
import { getServiceClient } from '@/lib/supabase/serviceClient';

interface IntrospectRequestBody {
  projectId?: string;
  schema?: string;
}

/**
 * Introspect a connected Supabase project's schema
 * Uses Supabase REST API instead of direct pg connection
 */
export async function POST(request: Request) {
  const body = (await request.json()) as IntrospectRequestBody;
  const projectId = body.projectId;
  const requestedSchema = body.schema ?? 'public';

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = getServiceClient();

  // Get connected project with credentials
  const { data: project, error: projectError } = await serviceClient
    .from('connected_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found or access denied' },
      { status: 404 }
    );
  }

  if (!project.supabase_url || !project.supabase_anon_key) {
    return NextResponse.json(
      { error: 'Project credentials missing' },
      { status: 400 }
    );
  }

  try {
    // Introspect using Supabase credentials (not pg connection)
    const schemaSnapshot = await introspectSupabaseProject(
      project.supabase_url,
      project.supabase_anon_key,
      requestedSchema
    );

    const statistics = {
      capturedSchema: requestedSchema,
      tableCount: schemaSnapshot.tables.length,
      columnCount: schemaSnapshot.columns.length,
      indexCount: schemaSnapshot.indexes.length,
    };

    // Save snapshot
    const { data: insertedSnapshot, error: insertError } = await serviceClient
      .from('schema_snapshots')
      .insert({
        project_id: project.id,
        tables_data: schemaSnapshot.tables,
        relationships_data: [],
        indexes_data: schemaSnapshot.indexes,
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Failed to save snapshot',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      snapshot: insertedSnapshot,
      schema: schemaSnapshot,
      statistics,
    });
  } catch (error) {
    console.error('Introspection error', error);
    return NextResponse.json(
      {
        error: 'Failed to introspect database',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

