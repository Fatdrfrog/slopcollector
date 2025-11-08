import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureStripeCustomer, getUsageEntitlement } from '@/lib/commerce/stripe';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { getServerClient } from '@/lib/supabase/server';
import { generateAdviceFromSnapshot } from '@/lib/ai/generateAdvice';
import type { DatabaseSchemaSnapshot } from '@/lib/postgres/introspect';

interface AdviceRequestBody {
  projectId?: string;
  snapshotId?: string;
  async?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as AdviceRequestBody;
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = getServiceClient();

  const { snapshot, projectId } = await resolveSnapshot(
    serviceClient,
    body.projectId,
    body.snapshotId
  );

  if (!snapshot) {
    return NextResponse.json(
      { error: 'Schema snapshot not found' },
      { status: 404 }
    );
  }

  const { data: project, error: projectError } = await serviceClient
    .from('projects')
    .select('id, organization_id, display_name')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Project not found for advice run' },
      { status: 404 }
    );
  }

  const { data: membership } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('organization_id', project.organization_id)
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stripeCustomer = await ensureStripeCustomer(user.id, user.email ?? undefined);
  const entitlement = getUsageEntitlement(stripeCustomer?.metadata ?? undefined);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: runCount } = await serviceClient
    .from('advice_runs')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', since);

  if (typeof runCount === 'number' && runCount >= entitlement.aiRunsPerDay) {
    return NextResponse.json(
      {
        error: 'Daily AI advice quota reached',
        allowed: entitlement.aiRunsPerDay,
      },
      { status: 429 }
    );
  }

  const { data: adviceRun, error: runError } = await serviceClient
    .from('advice_runs')
    .insert({
      project_id: projectId,
      snapshot_id: snapshot.id,
      status: 'processing',
    })
    .select('*')
    .single();

  if (runError || !adviceRun) {
    return NextResponse.json(
      { error: 'Failed to create advice run', details: runError?.message },
      { status: 500 }
    );
  }

  const processAdvice = async () => {
    try {
      const generated = await generateAdviceFromSnapshot(
        snapshot.raw_schema as DatabaseSchemaSnapshot,
        {
          projectName: project.display_name,
        }
      );

      const items = generated.advisories.map((item) => ({
        run_id: adviceRun.id,
        table_name: item.table ?? null,
        column_name: item.column ?? null,
        severity: normalizeSeverity(item.severity),
        category: item.category ?? 'optimization',
        headline: item.headline,
        description: item.description,
        remediation: item.remediation ?? null,
        metadata: item.metadata ?? {},
      }));

      if (items.length > 0) {
        const { error: insertError } = await serviceClient
          .from('advice_items')
          .insert(items);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      await serviceClient
        .from('advice_runs')
        .update({
          status: 'succeeded',
          summary: { overview: generated.summary },
          processed_at: new Date().toISOString(),
        })
        .eq('id', adviceRun.id);
    } catch (error) {
      await serviceClient
        .from('advice_runs')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown AI error',
          processed_at: new Date().toISOString(),
        })
        .eq('id', adviceRun.id);
      throw error;
    }
  };

  if (body.async) {
    void processAdvice();
    return NextResponse.json({
      runId: adviceRun.id,
      status: 'processing',
    });
  }

  try {
    await processAdvice();
    return NextResponse.json({
      runId: adviceRun.id,
      status: 'succeeded',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Advice generation failed',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}

async function resolveSnapshot(
  serviceClient: SupabaseClient,
  projectId: string | undefined,
  snapshotId: string | undefined
) {
  if (snapshotId) {
    const { data: snapshot } = await serviceClient
      .from('schema_snapshots')
      .select('id, project_id, raw_schema')
      .eq('id', snapshotId)
      .single();
    return { snapshot, projectId: snapshot?.project_id ?? projectId };
  }

  if (!projectId) {
    return { snapshot: null, projectId: undefined };
  }

  const { data: snapshot } = await serviceClient
    .from('schema_snapshots')
    .select('id, project_id, raw_schema')
    .eq('project_id', projectId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { snapshot, projectId };
}

function normalizeSeverity(value: string | undefined) {
  if (!value) return 'info';
  const normalized = value.toLowerCase();
  if (normalized === 'error' || normalized === 'critical') return 'error';
  if (normalized === 'warning' || normalized === 'warn') return 'warning';
  return 'info';
}

