import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { introspectDatabase } from '@/lib/postgres/introspect';
import { getServiceClient } from '@/lib/supabase/serviceClient';

interface IntrospectRequestBody {
  projectId?: string;
  connectionLabel?: string;
  schema?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as IntrospectRequestBody;
  const projectId = body.projectId;
  const requestedSchema = body.schema ?? 'public';
  const connectionLabel = body.connectionLabel;

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

  const { data: project, error: projectError } = await serviceClient
    .from('projects')
    .select('id, organization_id, connections ( id, label, connection_uri )')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found', details: projectError?.message },
      { status: 404 }
    );
  }

  const { data: membership } = await serviceClient
    .from('organization_members')
    .select('id, role, accepted_at')
    .eq('organization_id', project.organization_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || !membership.accepted_at) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const connections = (project as unknown as {
    connections?: Array<{
      id: string;
      label: string;
      connection_uri: string;
    }>;
  }).connections;

  if (!connections || connections.length === 0) {
    return NextResponse.json(
      { error: 'No connections configured for project' },
      { status: 400 }
    );
  }

  const resolvedConnection =
    connections.find((conn) => conn.label === connectionLabel) ?? connections[0];

  try {
    const schemaSnapshot = await introspectDatabase(
      resolvedConnection.connection_uri,
      requestedSchema
    );

    const statistics = {
      capturedSchema: requestedSchema,
      tableCount: schemaSnapshot.tables.length,
      columnCount: schemaSnapshot.columns.length,
      indexCount: schemaSnapshot.indexes.length,
    };

    const { data: insertedSnapshot, error: insertError } = await serviceClient
      .from('schema_snapshots')
      .insert({
        project_id: project.id,
        sampled_by: user.id,
        pg_version: null,
        raw_schema: schemaSnapshot,
        statistics,
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

