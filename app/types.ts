export interface Position {
  x: number;
  y: number;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  foreignKey?: string;
  indexed?: boolean;
  lastUsed?: string; // ISO date string
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: Position;
  rowCount?: number;
  columnCount?: number;
}

export type SuggestionSeverity = 'warning' | 'info' | 'error';

export interface CodeReference {
  filePath: string;
  lineNumber?: number;
  patternType: 'query' | 'join' | 'filter' | 'sort';
  frequency: number;
}

export interface Suggestion {
  id: string;
  tableId: string;
  tableName: string;
  columnName?: string;
  severity: SuggestionSeverity;
  type: 'unused' | 'not-indexed' | 'duplicate' | 'optimization';
  title: string;
  description: string;
  impact?: string;
  codeReferences?: CodeReference[];
  // Status tracking
  status?: 'pending' | 'applied' | 'dismissed' | null;
  appliedAt?: string | null;
  dismissedAt?: string | null;
}
