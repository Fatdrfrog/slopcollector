import type { Edge } from '@xyflow/react';
import type { Table } from '../types';
import { needsIndex } from './tableAnalysis';

/**
 * Generate React Flow edges from table foreign key relationships
 * @param tables - Array of tables to analyze for relationships
 * @returns Array of React Flow edges
 */
export function generateEdgesFromTables(tables: Table[]): Edge[] {
  const edges: Edge[] = [];
  
  tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (column.foreignKey) {
        const [targetTable] = column.foreignKey.split('.');
        const isMissingIndex = needsIndex(column);
        
        edges.push({
          id: `${table.id}-${column.name}-${targetTable}`,
          source: table.id,
          target: targetTable,
          sourceHandle: 'right',
          targetHandle: 'left',
          animated: false,
          style: { 
            stroke: isMissingIndex ? '#f59e0b' : '#6366f1', 
            strokeWidth: 2.5,
          },
          type: 'smoothstep',
          label: column.name,
          labelStyle: { 
            fill: '#d1d5db', 
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'monospace',
          },
          labelBgStyle: { 
            fill: '#0f0f0f', 
            fillOpacity: 0.95,
          },
          labelBgPadding: [4, 8],
          labelBgBorderRadius: 6,
        });
      }
    });
  });
  
  return edges;
}
