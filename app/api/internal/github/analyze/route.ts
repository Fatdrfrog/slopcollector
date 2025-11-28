import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/serviceClient';
import { analyzeCodePatterns } from '@/lib/github/codeAnalyzer';
import { TableSchema } from '@/lib/types';

interface AnalyzeRequestBody {
  projectId: string;
}


export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const supabase = await getServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body.projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const serviceClient = getServiceClient();

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

    if (!project.github_enabled || !project.github_repo_url) {
      return NextResponse.json(
        { error: 'GitHub integration not enabled for this project' },
        { status: 400 }
      );
    }

    const { data: snapshot, error: snapshotError } = await serviceClient
      .from('schema_snapshots')
      .select('tables_data')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'No schema snapshot found. Please sync your project first.' },
        { status: 400 }
      );
    }

    const tables = (snapshot.tables_data as TableSchema[]) || [];
    const tableNames = tables.map((t) => t.tableName);

    if (tableNames.length === 0) {
      return NextResponse.json(
        { error: 'No tables found in schema' },
        { status: 400 }
      );
    }

    const patterns = await analyzeCodePatterns(
      project.github_repo_url,
      project.github_default_branch || 'main',
      tableNames
    );

    await serviceClient
      .from('code_patterns')
      .delete()
      .eq('project_id', project.id);

    if (patterns.length > 0) {
      const patternRecords = patterns.map((pattern) => ({
        project_id: project.id,
        table_name: pattern.tableName,
        column_name: pattern.columnName || null,
        pattern_type: pattern.patternType,
        file_path: pattern.filePath,
        line_number: pattern.lineNumber || null,
        code_snippet: pattern.codeSnippet,
        frequency: pattern.frequency,
      }));

      const { error: insertError } = await serviceClient
        .from('code_patterns')
        .insert(patternRecords);

      if (insertError) {
        console.error('Failed to store code patterns:', insertError);
      }
    }

    await serviceClient
      .from('connected_projects')
      .update({
        github_last_synced_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    const tablesAnalyzed = [...new Set(patterns.map((p) => p.tableName))];
    const filterPatterns = patterns.filter((p) => p.patternType === 'filter');
    const topColumns = filterPatterns
      .filter((p) => p.columnName)
      .reduce((acc, p) => {
        const key = `${p.tableName}.${p.columnName}`;
        acc[key] = (acc[key] || 0) + p.frequency;
        return acc;
      }, {} as Record<string, number>);


    const suggestions = Object.entries(topColumns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([col, freq]) => `Consider indexing ${col} (used in WHERE ${freq}x)`);


    return NextResponse.json({
      success: true,
      patternsFound: patterns.length,
      tablesAnalyzed,
      suggestions,
      summary: {
        totalPatterns: patterns.length,
        filterCount: filterPatterns.length,
        joinCount: patterns.filter((p) => p.patternType === 'join').length,
        sortCount: patterns.filter((p) => p.patternType === 'sort').length,
      },
    });
  } catch (error) {
    console.error('Code analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze code patterns',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

