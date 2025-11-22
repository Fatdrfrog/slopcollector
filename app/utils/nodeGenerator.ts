import type { Node } from '@xyflow/react';
import type { Table, Suggestion } from '../types';
import type { TableNodeData } from '../components/TableNode';
import { hasSchemaIssues, hasAISuggestions } from './tableAnalysis';
import { GraphCache } from './graphCache';

/**
 * Generate React Flow nodes from tables with caching
 * Converts database tables to visual nodes for the ERD canvas
 * 
 * @param tables - Array of tables to convert
 * @param selectedTable - Currently selected table ID (for highlighting)
 * @param onSelect - Callback function when a table is selected
 * @param suggestions - AI-generated suggestions for issue highlighting
 * @returns Array of React Flow nodes ready for rendering
 * 
 * @example
 * const nodes = generateNodesFromTables(
 *   tables, 
 *   selectedTableId, 
 *   handleTableSelect,
 *   suggestions
 * );
 */
export function generateNodesFromTables(
  tables: Table[],
  selectedTable: string | null,
  onSelect: (id: string | null) => void,
  suggestions: Suggestion[] = []
): Node<TableNodeData>[] {
  const cache = GraphCache.getInstance();
  const cacheKey = `nodes-${tables.length}-${selectedTable}-${suggestions.length}`;
  
  // Check cache first - avoid regenerating if inputs haven't changed
  const cached = cache.getCachedNodes(cacheKey);
  if (cached) {
    // Update onSelect callback (can't be cached as it's a function)
    return cached.map(node => ({
      ...node,
      data: { ...node.data, onSelect }
    }));
  }
  
  // Generate new nodes
  const nodes = tables.map((table) => ({
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

  // Cache the result (without the onSelect callback)
  const cacheable = nodes.map(node => ({
    ...node,
    data: { ...node.data, onSelect: () => {} } // Placeholder for caching
  }));
  cache.setCachedNodes(cacheKey, cacheable);
  
  return nodes;
}
