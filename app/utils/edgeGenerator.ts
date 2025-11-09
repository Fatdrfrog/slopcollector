import type { Edge } from '@xyflow/react';
import type { Table } from '../types';
import { needsIndex } from './tableAnalysis';

/**
 * Generate React Flow edges from table foreign key relationships
 * Creates proper ERD diagram connections
 * @param tables - Array of tables to analyze for relationships
 * @returns Array of React Flow edges
 */
export function generateEdgesFromTables(tables: Table[]): Edge[] {
  const edges: Edge[] = [];
  const tableExists = new Set(tables.map(t => t.id));
  
  tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (column.foreignKey) {
        const [targetTable] = column.foreignKey.split('.');
        
        // Only create edge if target table exists
        if (!tableExists.has(targetTable)) {
          console.warn(`FK reference to missing table: ${table.name}.${column.name} → ${targetTable}`);
          return;
        }
        
        const isMissingIndex = needsIndex(column);
        
        edges.push({
          id: `${table.id}-${column.name}-${targetTable}`,
          source: table.id,
          target: targetTable,
          sourceHandle: 'right',
          targetHandle: 'left',
          animated: isMissingIndex, // Animate if missing index (shows performance issue!)
          style: { 
            stroke: isMissingIndex ? '#ff6b6b' : '#7ed321',  // Red if missing index, green if good
            strokeWidth: 2,
          },
          type: 'smoothstep',
          label: column.name,
          labelStyle: { 
            fill: '#ccc', 
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'monospace',
          },
          labelBgStyle: { 
            fill: '#0f0f0f', 
            fillOpacity: 0.9,
          },
          labelBgPadding: [6, 10],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: 'arrowclosed',
            width: 20,
            height: 20,
            color: isMissingIndex ? '#ff6b6b' : '#7ed321',
          },
        });
      }
    });
  });
  
  console.log(`✅ Generated ${edges.length} FK relationships`);
  return edges;
}
