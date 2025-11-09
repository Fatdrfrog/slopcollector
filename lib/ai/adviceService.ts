import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAdviceFromSnapshot } from './generateAdvice';
import type { DatabaseSchemaSnapshot } from '../supabase/introspect';

/**
 * Shared service for generating AI advice
 * Used by both manual API endpoint and cron job
 */

export interface GenerateAdviceResult {
  suggestions: Array<{
    tableName: string;
    columnName?: string;
    severity: string;
    type: string;
    title: string;
    description: string;
    sqlSnippet?: string;
  }>;
  summary: string;
  stats?: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
  };
}

/**
 * Generate AI advice for a project
 * Single source of truth for advice generation logic
 */
export async function generateAIAdviceForProject(
  serviceClient: SupabaseClient,
  projectId: string,
  options?: {
    projectName?: string;
    skipRecentCheck?: boolean;
    cooldownHours?: number;
  }
): Promise<GenerateAdviceResult> {
  const cooldownHours = options?.cooldownHours ?? 6;

  // Check if we've generated advice recently (unless skipped)
  if (!options?.skipRecentCheck) {
    const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
    const { data: recentJob } = await serviceClient
      .from('analysis_jobs')
      .select('id, created_at')
      .eq('project_id', projectId)
      .eq('job_type', 'ai_advice')
      .eq('status', 'completed')
      .gte('created_at', cooldownTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentJob) {
      throw new Error(
        `Advice was generated recently at ${new Date(recentJob.created_at).toLocaleString()}. Please wait before generating again.`
      );
    }
  }

  // Get latest schema snapshot
  const { data: snapshot, error: snapshotError } = await serviceClient
    .from('schema_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (snapshotError || !snapshot) {
    throw new Error('No schema snapshot found. Please sync your project first.');
  }

  // Build DatabaseSchemaSnapshot from snapshot data
  const schemaSnapshot: DatabaseSchemaSnapshot = {
    tables: (snapshot.tables_data as any[]) || [],
    columns: (snapshot.columns_data as any[]) || [],
    indexes: (snapshot.indexes_data as any[]) || [],
  };

  // Generate AI suggestions using OpenAI
  const advice = await generateAdviceFromSnapshot(schemaSnapshot, {
    projectName: options?.projectName || 'Unnamed Project',
  });

  // Convert to our format
  const suggestions = advice.advisories.map((item) => ({
    tableName: item.table || 'unknown',
    columnName: item.column,
    severity: mapSeverityToDb(item.severity),
    type: mapCategoryToType(item.category),
    title: item.headline,
    description: item.description,
    sqlSnippet: item.remediation,
  }));

  return {
    suggestions,
    summary: advice.summary,
    stats: advice.stats,
  };
}

/**
 * Store generated suggestions in database
 * Handles deduplication and applied detection
 */
export async function storeAdviceSuggestions(
  serviceClient: SupabaseClient,
  projectId: string,
  snapshotId: string,
  suggestions: GenerateAdviceResult['suggestions'],
  options?: {
    schemaSnapshot?: DatabaseSchemaSnapshot;
  }
): Promise<{
  newSuggestions: number;
  appliedDetected: number;
  skipped: number;
}> {
  // Get existing suggestions to avoid duplicates and detect applied ones
  const { data: existingSuggestions } = await serviceClient
    .from('optimization_suggestions')
    .select('*')
    .eq('project_id', projectId);

  const existingMap = new Map(
    (existingSuggestions || []).map((s) => [
      `${s.table_name}:${s.column_name || ''}:${s.suggestion_type}`,
      s,
    ])
  );

  const newSuggestions = [];
  const appliedSuggestionIds = [];
  let skipped = 0;

  for (const suggestion of suggestions) {
    const key = `${suggestion.tableName}:${suggestion.columnName || ''}:${suggestion.type}`;
    const existing = existingMap.get(key);

    // Skip if user already applied or dismissed this suggestion
    if (existing && (existing.status === 'applied' || existing.status === 'dismissed')) {
      skipped++;
      continue;
    }

    // Check if suggestion was auto-applied (user created the index manually)
    let wasApplied = false;
    if (options?.schemaSnapshot && suggestion.sqlSnippet) {
      wasApplied = checkIfSuggestionApplied(
        suggestion.sqlSnippet,
        options.schemaSnapshot,
        suggestion.tableName
      );
    }

    if (wasApplied) {
      if (existing && existing.status === 'pending') {
        // Mark existing suggestion as applied
        appliedSuggestionIds.push(existing.id);
      }
      skipped++;
      continue;
    }

    // Create new suggestion
    newSuggestions.push({
      project_id: projectId,
      snapshot_id: snapshotId,
      table_name: suggestion.tableName,
      column_name: suggestion.columnName || null,
      suggestion_type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      severity: suggestion.severity,
      impact_score: mapEstimatedImpactToScore(suggestion.severity),
      sql_snippet: suggestion.sqlSnippet || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  // Mark auto-applied suggestions
  if (appliedSuggestionIds.length > 0) {
    await serviceClient
      .from('optimization_suggestions')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .in('id', appliedSuggestionIds);
  }

  // Insert new suggestions
  if (newSuggestions.length > 0) {
    const { error: insertError } = await serviceClient
      .from('optimization_suggestions')
      .insert(newSuggestions);

    if (insertError) {
      throw new Error(`Failed to insert suggestions: ${insertError.message}`);
    }
  }

  return {
    newSuggestions: newSuggestions.length,
    appliedDetected: appliedSuggestionIds.length,
    skipped,
  };
}

/**
 * Check if a suggestion was applied by the user
 * Compares suggested SQL with current schema state
 */
function checkIfSuggestionApplied(
  remediation: string,
  snapshot: DatabaseSchemaSnapshot,
  tableName: string
): boolean {
  // Extract index name from CREATE INDEX statement
  const indexNameMatch = remediation.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
  if (!indexNameMatch) return false;

  const suggestedIndexName = indexNameMatch[1].toLowerCase();

  // Check if index exists in current schema
  const indexExists = snapshot.indexes.some(
    (idx) =>
      idx.indexName.toLowerCase() === suggestedIndexName &&
      idx.tableName.toLowerCase() === tableName.toLowerCase()
  );

  return indexExists;
}

/**
 * Map AI category to database suggestion_type
 */
function mapCategoryToType(category: string): string {
  const map: Record<string, string> = {
    missing_index: 'missing_index',
    composite_index: 'composite_index',
    unused_index: 'unused_column',
    slow_query: 'slow_query',
    unused_column: 'unused_column',
    rls_policy: 'rls_policy',
    foreign_key: 'foreign_key',
    data_type: 'data_type_optimization',
    normalization: 'other',
  };
  return map[category] || 'other';
}

/**
 * Map AI severity to database severity
 * OpenAI returns: 'error', 'warning', 'info'
 * Database accepts: 'critical', 'high', 'medium', 'low'
 */
function mapSeverityToDb(severity: string): string {
  const map: Record<string, string> = {
    error: 'critical',
    warning: 'medium',
    info: 'low',
  };
  return map[severity] || 'medium';
}

/**
 * Map severity to numeric score (0-100)
 */
function mapEstimatedImpactToScore(severity: string): number | null {
  const map: Record<string, number> = {
    critical: 90,
    high: 75,
    medium: 50,
    low: 25,
  };
  return map[severity] || 50;
}

