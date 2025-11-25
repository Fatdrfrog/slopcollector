/**
 * Code Analysis Service
 * Analyzes GitHub repository code to find database query patterns
 */

import { parseGitHubUrl } from './detector';

export interface CodePattern {
  tableName: string;
  columnName?: string;
  patternType: 'query' | 'join' | 'filter' | 'sort';
  filePath: string;
  lineNumber?: number;
  codeSnippet: string;
  frequency: number;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface GitHubBlobResponse {
  content: string;
  encoding: string;
}

/**
 * Analyze repository for database query patterns
 * @param repoUrl - GitHub repository URL
 * @param branch - Branch to analyze (default: 'main')
 * @param tables - List of table names to search for
 * @returns Array of code patterns found
 */
export async function analyzeCodePatterns(
  repoUrl: string,
  branch: string = 'main',
  tables: string[]
): Promise<CodePattern[]> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL');
  }

  const { owner, repo } = parsed;
  const patterns: CodePattern[] = [];

  try {
    // Get repository tree (file list)
    const files = await fetchRepoFiles(owner, repo, branch);

    // Filter for relevant code files
    const codeFiles = files.filter((file) =>
      /\.(ts|tsx|js|jsx|sql)$/.test(file.path)
    );

    // Analyze each file (limit to avoid rate limits)
    const filesToAnalyze = codeFiles.slice(0, 50); // Limit to 50 files for MVP

    for (const file of filesToAnalyze) {
      try {
        const content = await fetchFileContent(owner, repo, file.sha);
        const filePatterns = extractPatterns(content, file.path, tables);
        patterns.push(...filePatterns);
      } catch (error) {
        console.error(`Failed to analyze ${file.path}:`, error);
        // Continue with other files
      }
    }

    // Aggregate patterns by deduplication
    return aggregatePatterns(patterns);
  } catch (error) {
    console.error('Failed to analyze code patterns:', error);
    throw error;
  }
}

/**
 * Fetch repository file tree from GitHub API
 */
async function fetchRepoFiles(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubTreeItem[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SlopCollector',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.tree || [];
}

/**
 * Fetch file content from GitHub API
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  sha: string
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SlopCollector',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }

  const data = (await response.json()) as GitHubBlobResponse;

  // Decode base64 content
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  return data.content;
}

/**
 * Extract database query patterns from file content
 */
function extractPatterns(
  content: string,
  filePath: string,
  tables: string[]
): CodePattern[] {
  const patterns: CodePattern[] = [];
  const lines = content.split('\n');

  // Create regex patterns for each table
  for (const tableName of tables) {
    // Pattern 1: Supabase client queries - .from('table')
    const supabasePattern = new RegExp(
      `\\.from\\s*\\(\\s*['"\`]${tableName}['"\`]\\s*\\)`,
      'gi'
    );

    // Pattern 2: SQL queries - FROM table, JOIN table
    const sqlPattern = new RegExp(
      `(?:FROM|JOIN|INTO|UPDATE|DELETE\\s+FROM)\\s+${tableName}\\b`,
      'gi'
    );

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        return;
      }

      // Check for Supabase patterns
      if (supabasePattern.test(line)) {
        // Extract column filters (.eq, .filter, .order, etc.)
        const columnPatterns = extractSupabaseColumns(line, tableName);
        
        if (columnPatterns.length > 0) {
          patterns.push(...columnPatterns.map(cp => ({
            ...cp,
            filePath,
            lineNumber,
            codeSnippet: trimmedLine.substring(0, 150),
            frequency: 1,
          })));
        } else {
          // Generic query without specific column
          patterns.push({
            tableName,
            patternType: 'query',
            filePath,
            lineNumber,
            codeSnippet: trimmedLine.substring(0, 150),
            frequency: 1,
          });
        }
      }

      // Check for SQL patterns
      if (sqlPattern.test(line)) {
        // Extract WHERE, JOIN, ORDER BY columns
        const sqlColumnPatterns = extractSQLColumns(line, tableName);
        
        if (sqlColumnPatterns.length > 0) {
          patterns.push(...sqlColumnPatterns.map(cp => ({
            ...cp,
            filePath,
            lineNumber,
            codeSnippet: trimmedLine.substring(0, 150),
            frequency: 1,
          })));
        }
      }
    });
  }

  return patterns;
}

/**
 * Extract column names from Supabase client query methods
 */
function extractSupabaseColumns(
  line: string,
  tableName: string
): Array<{ tableName: string; columnName: string; patternType: CodePattern['patternType'] }> {
  const patterns: Array<{ tableName: string; columnName: string; patternType: CodePattern['patternType'] }> = [];

  // .eq('column', value)
  const eqMatches = line.matchAll(/\.eq\s*\(\s*['"`](\w+)['"`]/gi);
  for (const match of eqMatches) {
    const columnName = match[1];
    if (columnName) {
      patterns.push({
        tableName,
        columnName,
        patternType: 'filter',
      });
    }
  }

  // .filter('column', 'operator', value)
  const filterMatches = line.matchAll(/\.filter\s*\(\s*['"`](\w+)['"`]/gi);
  for (const match of filterMatches) {
    const columnName = match[1];
    if (columnName) {
      patterns.push({
        tableName,
        columnName,
        patternType: 'filter',
      });
    }
  }

  // .order('column')
  const orderMatches = line.matchAll(/\.order\s*\(\s*['"`](\w+)['"`]/gi);
  for (const match of orderMatches) {
    const columnName = match[1];
    if (columnName) {
      patterns.push({
        tableName,
        columnName,
        patternType: 'sort',
      });
    }
  }

  // .select with specific columns
  const selectMatches = line.matchAll(/\.select\s*\(\s*['"`]([^'"`]+)['"`]/gi);
  for (const match of selectMatches) {
    const matchResult = match[1];
    if (matchResult) {
      const columns = matchResult.split(',').map(c => c.trim());
      columns.forEach(col => {
        const colName = col.includes('.') ? col.split('.').pop() : col;
        if (colName && colName !== '*' && !/\(/.test(colName)) {
          patterns.push({
            tableName,
            columnName: colName,
            patternType: 'query',
          });
        }
      });
    }
  }

  return patterns;
}

/**
 * Extract column names from SQL queries
 */
function extractSQLColumns(
  line: string,
  tableName: string
): Array<{ tableName: string; columnName: string; patternType: CodePattern['patternType'] }> {
  const patterns: Array<{ tableName: string; columnName: string; patternType: CodePattern['patternType'] }> = [];

  // WHERE column = value
  const whereMatches = line.matchAll(/WHERE\s+(\w+)\s*[=<>!]/gi);
  for (const match of whereMatches) {
    const columnName = match[1];
    if (columnName) {
      patterns.push({
        tableName,
        columnName,
        patternType: 'filter',
      });
    }
  }

  // ORDER BY column
  const orderMatches = line.matchAll(/ORDER\s+BY\s+(\w+)/gi);
  for (const match of orderMatches) {
    const columnName = match[1];
    if (columnName) {
      patterns.push({
        tableName,
        columnName,
        patternType: 'sort',
      });
    }
  }

  // JOIN table ON column
  const joinMatches = line.matchAll(/JOIN\s+\w+\s+ON\s+\w+\.(\w+)/gi);
  for (const match of joinMatches) {
    const columnName = match[1];
    if (columnName) {
      patterns.push({
        tableName,
        columnName,
        patternType: 'join',
      });
    }
  }

  return patterns;
}

/**
 * Aggregate patterns by deduplication and frequency counting
 */
function aggregatePatterns(patterns: CodePattern[]): CodePattern[] {
  const aggregated = new Map<string, CodePattern>();

  patterns.forEach((pattern) => {
    const key = `${pattern.tableName}:${pattern.columnName || '*'}:${pattern.patternType}:${pattern.filePath}`;
    
    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.frequency += 1;
    } else {
      aggregated.set(key, { ...pattern });
    }
  });

  return Array.from(aggregated.values());
}

