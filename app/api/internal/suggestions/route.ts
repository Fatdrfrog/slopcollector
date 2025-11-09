import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import {
  markSuggestionAsApplied,
  markSuggestionAsDismissed,
  archiveSuggestion,
  getPendingSuggestions,
  getSuggestions,
  bulkUpdateSuggestionStatus,
  getSuggestionStats,
  type SuggestionStatus,
} from '@/lib/supabase/suggestions';

/**
 * GET /api/internal/suggestions
 * Fetch suggestions for a project
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status') as SuggestionStatus | null;
  const statsOnly = searchParams.get('stats') === 'true';

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const supabase = await getServerClient();

  // Verify user owns this project
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: project } = await supabase
    .from('connected_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found or access denied' },
      { status: 404 }
    );
  }

  // Return stats only
  if (statsOnly) {
    const stats = await getSuggestionStats(supabase, projectId);
    return NextResponse.json({ stats });
  }

  // Return suggestions
  const suggestions = status
    ? await getSuggestions(supabase, projectId, status)
    : await getPendingSuggestions(supabase, projectId);

  return NextResponse.json({ suggestions });
}

/**
 * PATCH /api/internal/suggestions
 * Update suggestion status (apply, dismiss, archive)
 */
export async function PATCH(request: Request) {
  const body = await request.json();
  const { suggestionId, suggestionIds, action } = body as {
    suggestionId?: string;
    suggestionIds?: string[];
    action: 'apply' | 'dismiss' | 'archive';
  };

  if (!action) {
    return NextResponse.json({ error: 'Action required' }, { status: 400 });
  }

  if (!suggestionId && !suggestionIds) {
    return NextResponse.json(
      { error: 'suggestionId or suggestionIds required' },
      { status: 400 }
    );
  }

  const supabase = await getServerClient();

  // Verify user owns the suggestion(s)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const ids = suggestionId ? [suggestionId] : suggestionIds!;
  const { data: suggestions } = await supabase
    .from('optimization_suggestions')
    .select('id, project_id')
    .in('id', ids);

  if (!suggestions || suggestions.length === 0) {
    return NextResponse.json(
      { error: 'Suggestion(s) not found' },
      { status: 404 }
    );
  }

  // Verify all suggestions belong to user's projects
  const projectIds = [...new Set(suggestions.map((s) => s.project_id))];
  const { data: projects } = await supabase
    .from('connected_projects')
    .select('id')
    .in('id', projectIds)
    .eq('user_id', user.id);

  if (!projects || projects.length !== projectIds.length) {
    return NextResponse.json(
      { error: 'Access denied to one or more suggestions' },
      { status: 403 }
    );
  }

  // Update suggestion status
  let result;

  if (suggestionIds) {
    // Bulk update
    const statusMap: Record<typeof action, SuggestionStatus> = {
      apply: 'applied',
      dismiss: 'dismissed',
      archive: 'archived',
    };
    result = await bulkUpdateSuggestionStatus(
      supabase,
      suggestionIds,
      statusMap[action]
    );
  } else {
    // Single update
    if (action === 'apply') {
      result = await markSuggestionAsApplied(supabase, suggestionId!);
    } else if (action === 'dismiss') {
      result = await markSuggestionAsDismissed(supabase, suggestionId!);
    } else if (action === 'archive') {
      result = await archiveSuggestion(supabase, suggestionId!);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to update suggestion' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Suggestion(s) ${action === 'apply' ? 'applied' : action === 'dismiss' ? 'dismissed' : 'archived'}`,
  });
}

