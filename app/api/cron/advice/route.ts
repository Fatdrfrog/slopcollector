import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { generateAIAdviceForProject, storeAdviceSuggestions } from '@/lib/ai/adviceService';
import type { DatabaseSchemaSnapshot } from '@/lib/supabase/introspect';

/**
 * Cron job: Generate AI-powered optimization suggestions for all active projects
 * Runs hourly via Vercel Cron
 * 
 * Flow:
 * 1. Fetch all active connected projects
 * 2. For each project, get latest schema snapshot
 * 3. Generate AI suggestions using OpenAI
 * 4. Store suggestions in optimization_suggestions table
 * 5. Smart deduplication: Don't recreate suggestions that user already applied/dismissed
 * 6. Track applied suggestions by comparing current indexes with suggested SQL
 */
export async function GET(request: Request) {
  // Verify this is a legitimate cron request from Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = getServiceClient();
  const startTime = Date.now();
  const results = {
    totalProjects: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    newSuggestions: 0,
    appliedDetected: 0,
    errors: [] as string[],
  };

  try {
    // Get all active projects
    const { data: projects, error: projectsError } = await serviceClient
      .from('connected_projects')
      .select('id, project_name, supabase_url, supabase_anon_key, user_id')
      .eq('is_active', true);

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    results.totalProjects = projects?.length ?? 0;

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'No active projects to process',
        results,
        duration: Date.now() - startTime,
      });
    }

    // Process each project
    for (const project of projects) {
      try {
        await processProjectAdvice(serviceClient, project, results);
        results.processed++;
      } catch (error) {
        console.error(`Failed to process project ${project.id}:`, error);
        results.failed++;
        results.errors.push(
          `${project.project_name || project.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      message: 'Cron job completed',
      results,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}

/**
 * Process a single project: generate suggestions and detect applied ones
 */
async function processProjectAdvice(
  serviceClient: SupabaseClient,
  project: {
    id: string;
    project_name: string | null;
    supabase_url: string;
    supabase_anon_key: string | null;
    user_id: string;
  },
  results: {
    newSuggestions: number;
    appliedDetected: number;
    skipped: number;
  }
) {
  // Get latest schema snapshot
  const { data: snapshot, error: snapshotError } = await serviceClient
    .from('schema_snapshots')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (snapshotError || !snapshot) {
    console.log(`No snapshot found for project ${project.id}, skipping`);
    results.skipped++;
    return;
  }

  // Check if we've generated advice recently (within last 6 hours)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: recentJob } = await serviceClient
    .from('analysis_jobs')
    .select('id, created_at')
    .eq('project_id', project.id)
    .eq('job_type', 'ai_advice')
    .eq('status', 'completed')
    .gte('created_at', sixHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentJob) {
    console.log(`Recent advice exists for project ${project.id}, skipping`);
    results.skipped++;
    return;
  }

  // Create analysis job
  const { data: job, error: jobError } = await serviceClient
    .from('analysis_jobs')
    .insert({
      project_id: project.id,
      job_type: 'ai_advice',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create job: ${jobError?.message}`);
  }

  try {
    // Generate AI suggestions using shared service
    const advice = await generateAIAdviceForProject(serviceClient, project.id, {
      projectName: project.project_name || 'Unnamed Project',
      skipRecentCheck: true, // Cron handles its own cooldown logic
      cooldownHours: 6,
    });

    // Build schema snapshot for storage
    const schemaSnapshot: DatabaseSchemaSnapshot = {
      tables: (snapshot.tables_data as any[]) || [],
      columns: (snapshot.columns_data as any[]) || [],
      indexes: (snapshot.indexes_data as any[]) || [],
    };

    // Store suggestions with deduplication and applied detection
    const storeResult = await storeAdviceSuggestions(
      serviceClient,
      project.id,
      snapshot.id,
      advice.suggestions,
      { schemaSnapshot }
    );

    // Update results
    results.newSuggestions += storeResult.newSuggestions;
    results.appliedDetected += storeResult.appliedDetected;

    // Update job status
    await serviceClient
      .from('analysis_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: {
          summary: advice.summary,
          stats: advice.stats,
          ...storeResult,
        },
        suggestions_count: storeResult.newSuggestions,
      })
      .eq('id', job.id);
  } catch (error) {
    // Update job as failed
    await serviceClient
      .from('analysis_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', job.id);

    throw error;
  }
}


