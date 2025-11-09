import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { validateGitHubUrl } from '@/lib/github/detector';

interface ConnectRequestBody {
  projectId: string;
  repoUrl: string;
  defaultBranch?: string;
}

/**
 * Connect GitHub repository to a Supabase project
 * POST /api/internal/github/connect
 * 
 * Note: Auto-detection is not possible because Supabase GitHub integration
 * is only accessible through Dashboard UI. Users must provide repo URL manually.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConnectRequestBody;
    const supabase = await getServerClient();

    // Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body.projectId || !body.repoUrl) {
      return NextResponse.json(
        { error: 'Project ID and repository URL required' },
        { status: 400 }
      );
    }

    // Validate GitHub URL
    const githubInfo = validateGitHubUrl(body.repoUrl);

    if (!githubInfo.hasGitHub) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Fetch project and verify ownership
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

    // Update project with GitHub details
    const { error: updateError } = await serviceClient
      .from('connected_projects')
      .update({
        github_repo_url: githubInfo.repoUrl,
        github_default_branch: body.defaultBranch || githubInfo.defaultBranch || 'main',
        github_enabled: true,
        github_last_synced_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    if (updateError) {
      console.error('Failed to update project with GitHub info:', updateError);
      return NextResponse.json(
        { error: 'Failed to save GitHub connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasGitHub: true,
      repoUrl: githubInfo.repoUrl,
      defaultBranch: body.defaultBranch || githubInfo.defaultBranch,
    });
  } catch (error) {
    console.error('GitHub connection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect GitHub repository',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

