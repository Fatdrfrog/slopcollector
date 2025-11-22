import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * PATCH /api/internal/suggestions/[id]/status
 * Update the status of a suggestion (mark as applied, dismissed, or reopen)
 * 
 * @param request - Request body: { action: 'apply' | 'dismiss' | 'reopen' }
 * @param params - Route params: { id: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    
    if (!['apply', 'dismiss', 'reopen'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "apply", "dismiss", or "reopen"' },
        { status: 400 }
      );
    }

    // Determine status updates based on action
    const now = new Date().toISOString();
    let updates: {
      status: string | null;
      applied_at: string | null;
      dismissed_at: string | null;
      updated_at: string;
    };

    switch (action) {
      case 'apply':
        updates = {
          status: 'applied',
          applied_at: now,
          dismissed_at: null,
          updated_at: now,
        };
        break;
      case 'dismiss':
        updates = {
          status: 'dismissed',
          applied_at: null,
          dismissed_at: now,
          updated_at: now,
        };
        break;
      case 'reopen':
      default:
        updates = {
          status: 'pending',
          applied_at: null,
          dismissed_at: null,
          updated_at: now,
        };
        break;
    }

    // Update the suggestion
    const { data: suggestion, error: updateError } = await supabase
      .from('optimization_suggestions')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating suggestion status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update suggestion status' },
        { status: 500 }
      );
    }

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestion,
      message: `Suggestion ${action === 'apply' ? 'marked as applied' : action === 'dismiss' ? 'dismissed' : 'reopened'}`,
    });

  } catch (error) {
    console.error('Error in PATCH /api/internal/suggestions/[id]/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
