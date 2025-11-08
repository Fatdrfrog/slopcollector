import { getOpenAIClient } from '../openai/client';
import type { DatabaseSchemaSnapshot } from '../postgres/introspect';

export interface GeneratedAdviceItem {
  severity: 'error' | 'warning' | 'info';
  category: string;
  table?: string;
  column?: string;
  headline: string;
  description: string;
  remediation?: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratedAdvice {
  summary: string;
  advisories: GeneratedAdviceItem[];
}

interface GenerateAdviceOptions {
  projectName?: string;
  temperature?: number;
  model?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

export async function generateAdviceFromSnapshot(
  snapshot: DatabaseSchemaSnapshot,
  options: GenerateAdviceOptions = {}
): Promise<GeneratedAdvice> {
  const openai = getOpenAIClient();
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.2;
  const payload = summarizeSnapshot(snapshot);

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content:
        'You are Supabase Postgres performance expert. Analyse schema data and return JSON with actionable advice. Use severity levels error/warning/info and categories such as missing_index, optimization, unused, security.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        project: options.projectName ?? 'Supabase Project',
        schema: payload,
      }),
    },
  ];

  const response = await openai.chat.completions.create({
    model,
    temperature,
    response_format: { type: 'json_object' },
    messages,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  let parsed: GeneratedAdvice;
  try {
    parsed = JSON.parse(content) as GeneratedAdvice;
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response: ${(error as Error).message}`);
  }

  if (!parsed.advisories) {
    parsed.advisories = [];
  }

  return parsed;
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

  return {
    tableCount: snapshot.tables.length,
    indexCount: snapshot.indexes.length,
    topTables: snapshot.tables.slice(0, 12).map((table) => {
      const key = `${table.schema}.${table.tableName}`;
      const columns = (columnsByTable[key] ?? []).slice(0, 24).map((column) => ({
        column: column.columnName,
        type: column.dataType,
        nullable: column.isNullable,
        default: column.columnDefault,
        indexed: (indexesByTable[key] ?? [])
          .some((idx) => idx.columns.some((name) => name.replace(/"/g, '').startsWith(column.columnName))),
      }));

      const indexes = (indexesByTable[key] ?? []).slice(0, 16).map((index) => ({
        name: index.indexName,
        unique: index.isUnique,
        primary: index.isPrimary,
        columns: index.columns,
        definition: index.indexDefinition,
      }));

      return {
        schema: table.schema,
        table: table.tableName,
        rowEstimate: table.rowEstimate,
        totalBytes: table.totalBytes,
        columns,
        indexes,
      };
    }),
  };
}

