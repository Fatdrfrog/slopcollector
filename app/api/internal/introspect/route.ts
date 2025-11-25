import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { introspectSupabaseProject } from '@/lib/supabase/introspect';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { createUnauthorizedResponse, createBadRequestResponse, createNotFoundResponse, createInternalErrorResponse } from '@/lib/utils/api-errors';

interface IntrospectRequestBody {
  projectId?: string;
  schema?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as IntrospectRequestBody;
  const projectId = body.projectId;
  const requestedSchema = body.schema ?? 'public';

  if (!projectId) {
    return createBadRequestResponse('projectId is required');
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createUnauthorizedResponse();
  }

  const serviceClient = getServiceClient();

  const { data: project, error: projectError } = await serviceClient
    .from('connected_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (projectError || !project) {
    return createNotFoundResponse('Project not found or access denied');
  }

  if (!project.supabase_url || !project.supabase_anon_key) {
    return createBadRequestResponse('Project credentials missing');
  }

  try {
    const schemaSnapshot = await introspectSupabaseProject(
      project.supabase_url,
      project.supabase_anon_key,
      requestedSchema
    );

    const relationships = schemaSnapshot.columns
      .filter((col) => col.foreignKeyTo)
      .map((col) => ({
        sourceTable: col.tableName,
        sourceColumn: col.columnName,
        target: col.foreignKeyTo!,
      }));

    const statistics = {
      capturedSchema: requestedSchema,
      tableCount: schemaSnapshot.tables.length,
      columnCount: schemaSnapshot.columns.length,
      indexCount: schemaSnapshot.indexes.length,
      relationshipCount: relationships.length,
    };

    const { data: insertedSnapshot, error: insertError } = await serviceClient
      .from('schema_snapshots')
      .insert({
        project_id: project.id,
        tables_data: schemaSnapshot.tables,
        columns_data: schemaSnapshot.columns,  // Store columns!
        relationships_data: relationships,
        indexes_data: schemaSnapshot.indexes,
      })
      .select('*')
      .single();

    if (insertError) {
      return createInternalErrorResponse('Failed to save snapshot', insertError.message);
    }

    return NextResponse.json({
      snapshot: insertedSnapshot,
      schema: schemaSnapshot,
      statistics,
    });
  } catch (error) {
    console.error('Introspection error', error);
    return createInternalErrorResponse(
      'Failed to introspect database',
      error instanceof Error ? error.message : String(error)
    );
  }
}

