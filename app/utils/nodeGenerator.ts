import type { Node } from '@xyflow/react';
import type { Table, Suggestion } from '../types';
import type { TableNodeData } from '../components/TableNode';
import { hasSchemaIssues, hasAISuggestions } from './tableAnalysis';

/**
 * Convert tables to React Flow nodes
 * @param tables - Array of tables
 * @param selectedTable - Currently selected table ID
 * @param onSelect - Callback for table selection
 * @param suggestions - AI-generated suggestions for issue coloring
 * @returns Array of React Flow nodes
 */
export function generateNodesFromTables(
  tables: Table[],
  selectedTable: string | null,
  onSelect: (id: string | null) => void,
  suggestions: Suggestion[] = []
): Node<TableNodeData>[] {
  return tables.map((table) => ({
    id: table.id,
    type: 'tableNode',
    position: table.position,
    data: { 
      table,
      isSelected: selectedTable === table.id,
      onSelect,
      hasAIIssues: hasAISuggestions(table.id, suggestions),
      hasSchemaIssues: hasSchemaIssues(table),
    },
    draggable: true,
  }));
}
