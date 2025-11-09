import { getOpenAIClient } from '../openai/client';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { DatabaseSchemaSnapshot, IndexSchema, TableSchema } from '../supabase/introspect';

/**
 * Zod schema for strict validation of AI-generated advice
 * Ensures reliable, type-safe JSON structure
 */
export const AdviceItemSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']).describe('Criticality level of the issue'),
  category: z.enum([
    'missing_index',
    'composite_index', 
    'unused_index',
    'slow_query',
    'unused_column',
    'rls_policy',
    'foreign_key',
    'data_type',
    'normalization',
  ]).describe('Type of optimization'),
  table: z.string().describe('Affected table name'),
  column: z.string().optional().describe('Affected column name if applicable'),
  headline: z.string().min(10).max(100).describe('Short, actionable title (10-100 chars)'),
  description: z.string().min(20).max(500).describe('Detailed explanation with performance impact (20-500 chars)'),
  remediation: z.string().optional().describe('SQL statement to fix the issue'),
  estimatedImpact: z.enum(['high', 'medium', 'low']).optional().describe('Expected performance improvement'),
  affectedQueries: z.array(z.string()).optional().describe('Common query patterns affected'),
});

export const GeneratedAdviceSchema = z.object({
  summary: z.string().min(20).max(300).describe('Overall schema health summary (20-300 chars)'),
  advisories: z.array(AdviceItemSchema).min(0).max(50).describe('List of optimization suggestions'),
  stats: z.object({
    totalIssues: z.number().int().min(0),
    criticalIssues: z.number().int().min(0),
    warningIssues: z.number().int().min(0),
    infoIssues: z.number().int().min(0),
  }).optional().describe('Issue statistics'),
});

export type GeneratedAdviceItem = z.infer<typeof AdviceItemSchema>;
export type GeneratedAdvice = z.infer<typeof GeneratedAdviceSchema>;

interface GenerateAdviceOptions {
  projectName?: string;
  temperature?: number;
  model?: string;
}

const DEFAULT_MODEL = 'gpt-5';

const SYSTEM_PROMPT = `You are an elite PostgreSQL performance consultant specializing in Supabase database optimization. Your expertise includes:
- Index strategy and query optimization
- Data modeling and normalization
- Row Level Security (RLS) policies
- Foreign key relationships and referential integrity
- Storage and performance tuning

## Your Task
Analyze the provided database schema with ALL its tables, columns, indexes, and foreign key relationships.
Generate actionable optimization recommendations based on the COMPLETE schema structure.

## Output Requirements
Return a JSON object with this EXACT structure:

{
  "summary": "Brief overall assessment (20-300 chars)",
  "advisories": [
    {
      "severity": "error|warning|info",
      "category": "missing_index|composite_index|unused_index|slow_query|unused_column|rls_policy|foreign_key|data_type|normalization",
      "table": "table_name",
      "column": "column_name (optional)",
      "headline": "Action-oriented title (10-100 chars)",
      "description": "Detailed impact explanation (20-500 chars)",
      "remediation": "CREATE INDEX ... SQL (optional)",
      "estimatedImpact": "high|medium|low (optional)",
      "affectedQueries": ["Common query patterns (optional)"]
    }
  ],
  "stats": {
    "totalIssues": 5,
    "criticalIssues": 2,
    "warningIssues": 2,
    "infoIssues": 1
  }
}

## Severity Guidelines
- **error**: Critical performance issues (missing FK indexes, no RLS on public tables, N+1 query patterns)
- **warning**: Moderate issues (suboptimal indexes, missing composite indexes, unused columns)
- **info**: Best practice recommendations (consider partitioning, archive old data)

## Category Guidelines
- **missing_index**: Foreign key or frequently filtered column lacks index
- **composite_index**: Multiple columns often queried together need composite index
- **unused_index**: Index exists but rarely/never used (check pg_stat_user_indexes)
- **slow_query**: Query pattern detected that will perform poorly at scale
- **unused_column**: Column rarely accessed, consider removal or archival
- **rls_policy**: Missing or misconfigured Row Level Security
- **foreign_key**: Missing FK constraint or index on FK column
- **data_type**: Inefficient data type choice (text instead of varchar, etc)
- **normalization**: Denormalization opportunity or over-normalization issue

## Focus Areas
1. **Missing Indexes** (Priority 1)
   - Foreign key columns without indexes (CHECK foreignKeyTo field!)
   - Timestamp columns (created_at, updated_at) in large tables
   - Status/type enum columns
   - Columns in WHERE clauses

2. **Performance Bottlenecks** (Priority 2)
   - N+1 query patterns from unindexed FKs (use foreignKeys array!)
   - Full table scans on large tables
   - Inefficient JOIN operations
   - Missing composite indexes for common query patterns

3. **Security** (Priority 3)
   - Public tables without RLS policies
   - Missing FK constraints (check isPrimaryKey and foreignKeyTo fields)

4. **Best Practices** (Priority 4)
   - Dead columns consuming storage
   - Opportunities for composite indexes based on relationships

## Examples

Example 1 - Missing FK Index:
{
  "severity": "error",
  "category": "missing_index",
  "table": "posts",
  "column": "user_id",
  "headline": "Add index on posts.user_id foreign key",
  "description": "Foreign key posts.user_id lacks an index. Queries like 'SELECT * FROM posts WHERE user_id = ?' will perform full table scans. With 128K rows, this causes ~500ms query times that will worsen as data grows.",
  "remediation": "CREATE INDEX idx_posts_user_id ON posts(user_id);",
  "estimatedImpact": "high",
  "affectedQueries": ["SELECT * FROM posts WHERE user_id = ?", "JOIN posts ON users.id = posts.user_id"]
}

Example 2 - Composite Index Opportunity:
{
  "severity": "warning",
  "category": "composite_index",
  "table": "orders",
  "headline": "Create composite index on orders(user_id, created_at)",
  "description": "Queries filtering by user_id and sorting by created_at would benefit from a composite index. Current setup requires separate index scans.",
  "remediation": "CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);",
  "estimatedImpact": "medium",
  "affectedQueries": ["SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC"]
}

Example 3 - Missing RLS:
{
  "severity": "error",
  "category": "rls_policy",
  "table": "user_profiles",
  "headline": "Enable RLS on user_profiles table",
  "description": "Table user_profiles is publicly accessible via Supabase API but has no Row Level Security. Users can read/modify any profile.",
  "remediation": "ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;\\nCREATE POLICY user_profiles_select ON user_profiles FOR SELECT USING (auth.uid() = user_id);",
  "estimatedImpact": "high"
}

## Important
- Be specific with table/column names
- Provide actual SQL in remediation
- Prioritize issues by real performance impact
- Focus on top 5-10 most critical issues
- Skip minor optimizations in small tables (<1000 rows)`;

export async function generateAdviceFromSnapshot(
  snapshot: DatabaseSchemaSnapshot,
  options: GenerateAdviceOptions = {}
): Promise<GeneratedAdvice> {
  const openai = getOpenAIClient();
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 1;
  const payload = summarizeSnapshot(snapshot);

  console.log(`🤖 Calling OpenAI API with model: ${model}`);

  const userPrompt = `Project: ${options.projectName ?? 'Supabase Project'}

Database Schema Analysis:
${JSON.stringify(payload, null, 2)}

IMPORTANT Context:
- The schema includes ${payload.tableCount} tables, ${payload.indexCount} indexes, and ${payload.foreignKeyCount} foreign key relationships
- Each table object shows:
  * columns[] with isPrimaryKey and foreignKeyTo fields  
  * indexes[] with existing indexes
  * foreignKeys[] showing relationships
  * rowEstimate and totalBytes for size context

Critical Analysis Focus:
1. Foreign key columns WITHOUT indexes (check: foreignKeyTo field present but indexed=false)
2. Large tables (high rowEstimate) without proper indexes on filtered columns
3. Missing composite indexes for common query patterns
4. Tables without RLS policies (security risk)

Provide actionable, high-impact optimization recommendations.`;

  // GPT-5 reasoning token management
  // GPT-5 "thinks" internally before responding, consuming tokens for reasoning
  // If max_tokens is too low, GPT-5 uses all tokens for reasoning → empty response
  // Solution: Allocate enough tokens for BOTH reasoning + output
  const isGPT5 = model.toLowerCase().includes('gpt-5');
  const maxTokens = isGPT5 
    ? 16000  // GPT-5: ~8000-12000 for reasoning + 4000-8000 for output
    : 4000;  // GPT-4/other: normal allocation

  let response;
  try {
    response = await openai.chat.completions.create({
      model,
      temperature,
      response_format: zodResponseFormat(GeneratedAdviceSchema, 'database_advice'),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: maxTokens,
    });
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw new Error(
      `OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const choice = response.choices[0];
  const finishReason = choice?.finish_reason;
  const usage = response.usage;

  // Log token usage (especially reasoning tokens for GPT-5)
  console.log(`✅ OpenAI response received:`, {
    model: response.model,
    finishReason,
    totalTokens: usage?.total_tokens,
    completionTokens: usage?.completion_tokens,
    // @ts-ignore - reasoning_tokens might not be in types yet
    reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
  });

  // Handle GPT-5 reasoning token exhaustion
  if (!choice?.message?.content && finishReason === 'length') {
    // @ts-ignore
    const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens || 0;
    const suggestedTokens = Math.ceil((reasoningTokens + 2000) * 1.2); // 20% buffer

    console.error('❌ GPT-5 used all tokens for reasoning, no output produced!', {
      reasoningTokens,
      maxTokensUsed: maxTokens,
      suggestedMinimum: suggestedTokens,
    });

    throw new Error(
      `[GPT-5 Notice] Model used all ${maxTokens} tokens for internal reasoning (${reasoningTokens} reasoning tokens). ` +
      `No output was produced. Suggested minimum: ${suggestedTokens} tokens. ` +
      `This is automatically handled now - please retry.`
    );
  }

  const content = choice?.message?.content;
  if (!content) {
    console.error('❌ Empty content in response:', {
      choices: response.choices,
      model: response.model,
      usage: response.usage,
      finishReason,
    });
    throw new Error(
      `Empty response from OpenAI. Model: ${model}, Finish reason: ${finishReason || 'none'}`
    );
  }

  // Parse JSON (Structured Outputs guarantees valid JSON)
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
  }

  // Validate with Zod (should always pass with Structured Outputs)
  const validationResult = GeneratedAdviceSchema.safeParse(rawParsed);
  
  if (!validationResult.success) {
    console.error('❌ Zod validation failed (unexpected with Structured Outputs):', validationResult.error);
    
    // Fallback: Try to salvage what we can
    const fallback = rawParsed as any;
    return {
      summary: fallback?.summary || 'Schema analysis completed',
      advisories: Array.isArray(fallback?.advisories) 
        ? fallback.advisories.filter((item: any) => item?.table && item?.headline)
        : [],
      stats: fallback?.stats,
    };
  }

  console.log(`✅ Generated ${validationResult.data.advisories.length} optimization suggestions`);
  return validationResult.data;
}

type IndexSchemaWithDefinition = {
  indexDefinition?: string | null;
  definition?: string | null;
};

type TableSchemaWithSize = {
  totalBytes?: number | null;
  sizeBytes?: number | null;
  total_bytes?: number | null;
  table_bytes?: number | null;
};

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function getIndexDefinition(index: IndexSchema & IndexSchemaWithDefinition): string | null {
  return index.indexDefinition ?? index.definition ?? null;
}

function getTableTotalBytes(table: TableSchema & TableSchemaWithSize): number | null {
  const candidates = [
    table.totalBytes,
    table.sizeBytes,
    table.total_bytes,
    table.table_bytes,
  ];

  for (const candidate of candidates) {
    const coerced = coerceNumber(candidate);
    if (coerced !== null) {
      return coerced;
    }
  }

  return null;
}

function summarizeSnapshot(snapshot: DatabaseSchemaSnapshot) {
  const columnsByTable = snapshot.columns.reduce<Record<string, typeof snapshot.columns>>(
    (acc, column) => {
      const key = `${column.schema}.${column.tableName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(column);
      return acc;
    },
    {}
  );

  const indexesByTable = snapshot.indexes.reduce<Record<string, typeof snapshot.indexes>>(
    (acc, index) => {
      const key = `${index.schema}.${index.tableName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(index);
      return acc;
    },
    {}
  );

  // Extract foreign key relationships
  const foreignKeys: Array<{
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
  }> = [];

  snapshot.columns.forEach((column) => {
    if (column.foreignKeyTo) {
      const [targetTable, targetColumn] = column.foreignKeyTo.split('.');
      foreignKeys.push({
        sourceTable: column.tableName,
        sourceColumn: column.columnName,
        targetTable,
        targetColumn,
      });
    }
  });

  return {
    tableCount: snapshot.tables.length,
    indexCount: snapshot.indexes.length,
    foreignKeyCount: foreignKeys.length,
    foreignKeys,
    tables: snapshot.tables.map((table) => {
      const key = `${table.schema}.${table.tableName}`;
      const tableColumns = columnsByTable[key] ?? [];
      const tableIndexes = indexesByTable[key] ?? [];

      const columns = tableColumns.map((column) => ({
        column: column.columnName,
        type: column.dataType,
        nullable: column.isNullable,
        default: column.columnDefault,
        isPrimaryKey: column.isPrimaryKey || false,
        foreignKeyTo: column.foreignKeyTo || null,
        indexed: tableIndexes.some((idx) => 
          idx.columns.some((name) => name.replace(/"/g, '').startsWith(column.columnName))
        ),
      }));

      const indexes = tableIndexes.map((index) => ({
        name: index.indexName,
        unique: index.isUnique,
        primary: index.isPrimary,
        columns: index.columns,
        definition: getIndexDefinition(index as IndexSchema & IndexSchemaWithDefinition),
      }));

      // Find foreign keys for this table
      const tableForeignKeys = foreignKeys.filter(
        (fk) => fk.sourceTable === table.tableName
      );

      return {
        schema: table.schema,
        table: table.tableName,
        rowEstimate: table.rowEstimate,
        totalBytes: getTableTotalBytes(table as TableSchema & TableSchemaWithSize),
        columns,
        indexes,
        foreignKeys: tableForeignKeys,
        hasForeignKeys: tableForeignKeys.length > 0,
      };
    }),
  };
}

/**
 * Wrapper for advice generation API
 */
export async function generateAdviceForSchema(input: { tables: any[]; indexes: any[] }) {
  const snapshot: DatabaseSchemaSnapshot = {
    tables: input.tables,
    columns: [],
    indexes: input.indexes,
  };

  const advice = await generateAdviceFromSnapshot(snapshot);

  // Convert to optimization suggestions format
  return advice.advisories.map((item) => ({
    tableName: item.table || 'unknown',
    columnName: item.column,
    severity: item.severity === 'error' ? 'critical' : item.severity,
    type: mapCategoryToType(item.category),
    title: item.headline,
    description: item.description,
    sqlSnippet: item.remediation,
  }));
}

function mapCategoryToType(category: string): string {
  const map: Record<string, string> = {
    missing_index: 'missing_index',
    optimization: 'slow_query',
    unused: 'unused_column',
    security: 'rls_policy',
  };
  return map[category] || 'missing_index';
}

