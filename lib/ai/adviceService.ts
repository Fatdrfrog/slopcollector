import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAdviceFromSnapshot, type CodePatternContext } from './generateAdvice';
import type { DatabaseSchemaSnapshot } from '../supabase/introspect';

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

export async function generateAIAdviceForProject(
  serviceClient: SupabaseClient,
  projectId: string,
  options?: {
    projectName?: string;
    skipRecentCheck?: boolean;
    cooldownHours?: number;
    includeCodePatterns?: boolean;
  }
): Promise<GenerateAdviceResult> {
  const cooldownHours = options?.cooldownHours ?? 6;
  const includeCodePatterns = options?.includeCodePatterns ?? true;

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

  const schemaSnapshot: DatabaseSchemaSnapshot = {
    tables: (snapshot.tables_data as any[]) || [],
    columns: (snapshot.columns_data as any[]) || [],
    indexes: (snapshot.indexes_data as any[]) || [],
  };

  let codePatterns: CodePatternContext[] | undefined;
  if (includeCodePatterns) {
    const { data: patterns } = await serviceClient
      .from('code_patterns')
      .select('*')
      .eq('project_id', projectId);

    if (patterns && patterns.length > 0) {
      codePatterns = patterns.map((p) => ({
        tableName: p.table_name,
        columnName: p.column_name || undefined,
        patternType: p.pattern_type as 'query' | 'join' | 'filter' | 'sort',
        filePath: p.file_path,
        lineNumber: p.line_number || undefined,
        frequency: p.frequency || 1,
      }));
    }
  }

  const advice = await generateAdviceFromSnapshot(schemaSnapshot, {
    projectName: options?.projectName || 'Unnamed Project',
    codePatterns,
  });

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

    if (existing && (existing.status === 'applied' || existing.status === 'dismissed')) {
      skipped++;
      continue;
    }

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
        appliedSuggestionIds.push(existing.id);
      }
      skipped++;
      continue;
    }

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

  if (appliedSuggestionIds.length > 0) {
    await serviceClient
      .from('optimization_suggestions')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .in('id', appliedSuggestionIds);
  }

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

function checkIfSuggestionApplied(
  remediation: string,
  snapshot: DatabaseSchemaSnapshot,
  tableName: string
): boolean {
  const indexNameMatch = remediation.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
  if (!indexNameMatch || !indexNameMatch[1]) return false;

  const suggestedIndexName = indexNameMatch[1].toLowerCase();
  const indexExists = snapshot.indexes.some(
    (idx) =>
      idx.indexName.toLowerCase() === suggestedIndexName &&
      idx.tableName.toLowerCase() === tableName.toLowerCase()
  );

  return indexExists;
}

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

function mapSeverityToDb(severity: string): string {
  const map: Record<string, string> = {
    error: 'critical',
    warning: 'medium',
    info: 'low',
  };
  return map[severity] || 'medium';
}

function mapEstimatedImpactToScore(severity: string): number | null {
  const map: Record<string, number> = {
    critical: 90,
    high: 75,
    medium: 50,
    low: 25,
  };
  return map[severity] || 50;
}

