import type { Table, Column, Suggestion } from '../types';

/**
 * Check if a column is unused (not accessed in over a year)
 */
export function isColumnUnused(column: Column): boolean {
  if (!column.lastUsed) return false;
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return new Date(column.lastUsed).getTime() < oneYearAgo;
}

/**
 * Check if a foreign key column needs an index
 */
export function needsIndex(column: Column): boolean {
  return Boolean(column.foreignKey && !column.indexed);
}

/**
 * Check if a table has schema-detected issues (FK without index, unused columns)
 * Orange coloring for schema-level issues
 */
export function hasSchemaIssues(table: Table): boolean {
  return table.columns.some(col => needsIndex(col) || isColumnUnused(col));
}

/**
 * Check if a table has AI-generated suggestions
 * Red coloring for AI-detected issues
 */
export function hasAISuggestions(tableId: string, suggestions: Suggestion[]): boolean {
  return suggestions.some(s => s.tableId === tableId);
}

/**
 * Check if a table has any issues (legacy - for backwards compatibility)
 */
export function hasTableIssues(table: Table): boolean {
  return hasSchemaIssues(table);
}

/**
 * Count critical issues in a table (missing indexes on foreign keys)
 */
export function countCriticalIssues(table: Table): number {
  return table.columns.filter(needsIndex).length;
}

/**
 * Format row count for display
 */
export function formatRowCount(count?: number): string {
  if (!count) return '';
  return count.toLocaleString();
}
