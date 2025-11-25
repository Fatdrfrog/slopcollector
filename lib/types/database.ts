export interface ColumnSchema {
  schema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey?: boolean;
  foreignKeyTo?: string;
}

export interface TableSchema {
  schema: string;
  tableName: string;
  rowEstimate: number | null;
  description: string | null;
}

export interface IndexSchema {
  schema: string;
  tableName: string;
  indexName: string;
  isUnique: boolean;
  isPrimary: boolean;
  columns: string[];
}

export interface DatabaseSchemaSnapshot {
  tables: TableSchema[];
  columns: ColumnSchema[];
  indexes: IndexSchema[];
}

export type SuggestionStatus = 'pending' | 'applied' | 'dismissed' | 'archived';

export interface OptimizationSuggestion {
  id: string;
  project_id: string;
  snapshot_id: string | null;
  table_name: string;
  column_name: string | null;
  suggestion_type: string;
  title: string;
  description: string;
  severity: string;
  impact_score: number | null;
  sql_snippet: string | null;
  status: SuggestionStatus;
  dismissed_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}


