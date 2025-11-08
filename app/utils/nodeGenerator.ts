import type { Node } from '@xyflow/react';
import type { Table } from '../types';
import type { TableNodeData } from '../components/TableNode';

/**
 * Convert tables to React Flow nodes
 * @param tables - Array of tables
 * @param selectedTable - Currently selected table ID
 * @param onSelect - Callback for table selection
 * @returns Array of React Flow nodes
 */
export function generateNodesFromTables(
  tables: Table[],
  selectedTable: string | null,
  onSelect: (id: string | null) => void
): Node<TableNodeData>[] {
  return tables.map((table) => ({
    id: table.id,
    type: 'tableNode',
    position: table.position,
    data: { 
      table,
      isSelected: selectedTable === table.id,
      onSelect,
    },
    draggable: true,
  }));
}
