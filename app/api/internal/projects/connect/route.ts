import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';

interface ConnectProjectBody {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectName: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConnectProjectBody;
    const { supabaseUrl, supabaseAnonKey, projectName } = body;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase URL and anon key are required' },
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

    const service = getServiceClient();
    const now = new Date().toISOString();

    const { data: existingProjects, error: fetchError } = await service
      .from('connected_projects')
      .select('*')
      .eq('supabase_url', supabaseUrl)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch existing project:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing project', details: fetchError.message },
        { status: 500 }
      );
    }

    const primaryProject = existingProjects?.[0] ?? null;
    let projectId = primaryProject?.id;

    if (primaryProject) {
      const { error: updateError } = await service
        .from('connected_projects')
        .update({
          user_id: user.id,
          project_name: projectName,
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseAnonKey,
          is_active: true,
          connection_error: null,
          updated_at: now,
        })
        .eq('id', primaryProject.id);

      if (updateError) {
        console.error('Failed to update existing project:', updateError);
        return NextResponse.json(
          { error: 'Failed to update existing project', details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { data: insertedProject, error: insertError } = await service
        .from('connected_projects')
        .insert({
          user_id: user.id,
          project_name: projectName,
          supabase_url: supabaseUrl,
          supabase_anon_key: supabaseAnonKey,
          is_active: true,
          connection_error: null,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (insertError || !insertedProject) {
        console.error('Failed to create project:', insertError);
        return NextResponse.json(
          { error: 'Failed to create project', details: insertError?.message },
          { status: 500 }
        );
      }

      projectId = insertedProject.id;
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project sync failed: missing project identifier' },
        { status: 500 }
      );
    }

    const { error: deactivateError } = await service
      .from('connected_projects')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .neq('id', projectId);

    if (deactivateError) {
      console.error('Failed to deactivate other projects:', deactivateError);
      return NextResponse.json(
        { error: 'Failed to finalize project activation', details: deactivateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    console.error('Project connect error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error connecting project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

