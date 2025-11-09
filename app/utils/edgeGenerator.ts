import type { Edge } from '@xyflow/react';
import type { Table } from '../types';
import { needsIndex } from './tableAnalysis';

/**
 * Generate React Flow edges from table foreign key relationships
 * Creates proper ERD diagram connections
 * @param tables - Array of tables to analyze for relationships
 * @returns Array of React Flow edges
 */
export function generateEdgesFromTables(
  tables: Table[],
  nodePositions?: Map<string, { x: number; y: number }>
): Edge[] {
  const edges: Edge[] = [];

  const tableLookup = new Map<string, string>();
  tables.forEach((table) => {
    tableLookup.set(table.id.toLowerCase(), table.id);
    tableLookup.set(table.name.toLowerCase(), table.id);
  });

  let fkCount = 0;
  let edgeCount = 0;

  const getHandlePositions = (sourceId: string, targetId: string) => {
    const defaultHandles = { sourceHandle: 'bottom', targetHandle: 'top-target' };

    if (!nodePositions) {
      return defaultHandles;
    }

    const sourcePos = nodePositions.get(sourceId);
    const targetPos = nodePositions.get(targetId);

    if (!sourcePos || !targetPos) {
      return defaultHandles;
    }

    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal orientation
      if (dx > 0) {
        return { sourceHandle: 'right', targetHandle: 'left-target' };
      }
      return { sourceHandle: 'left', targetHandle: 'right-target' };
    }

    // Vertical orientation
    if (dy > 0) {
      return { sourceHandle: 'bottom', targetHandle: 'top-target' };
    }
    return { sourceHandle: 'top', targetHandle: 'bottom-target' };
  };

  tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (!column.foreignKey) {
        return;
      }

      fkCount++;
      const [targetTableName] = column.foreignKey.split('.');

      const possibleNames = [
        targetTableName,
        `${targetTableName}s`,
        targetTableName.replace(/y$/, 'ies'),
        targetTableName.replace(/s$/, ''),
        targetTableName.replace(/ch$/, 'ches'),
        targetTableName.replace(/x$/, 'xes'),
        `${targetTableName}es`,
      ];

      let actualTargetId: string | undefined;
      for (const possibleName of possibleNames) {
        const found = tableLookup.get(possibleName.toLowerCase());
        if (found) {
          actualTargetId = found;
          break;
        }
      }

      if (!actualTargetId) {
        console.warn(
          `⚠️  FK reference to missing table: ${table.name}.${column.name} → ${targetTableName} (tried: ${possibleNames.join(', ')})`
        );
        return;
      }

      edgeCount++;
      const isMissingIndex = needsIndex(column);
      const { sourceHandle, targetHandle } = getHandlePositions(table.id, actualTargetId);

      edges.push({
        id: `${table.id}-${column.name}-${actualTargetId}`,
        source: table.id,
        target: actualTargetId,
        sourceHandle,
        targetHandle,
        animated: isMissingIndex,
        className: 'transition-all duration-200',
        style: {
          stroke: isMissingIndex ? '#ff6b6b' : '#7ed321',
          strokeWidth: 2,
          strokeDasharray: isMissingIndex ? '5,5' : undefined,
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
    });
  });

  console.log(`✅ Generated ${edgeCount} edges from ${fkCount} foreign key columns`);
  if (edgeCount === 0 && fkCount > 0) {
    console.error(`❌ No edges created despite ${fkCount} FK columns found!`);
    console.log(`Available tables:`, tables.map((t) => t.name));
  } else if (edgeCount > 0) {
    console.log(`🎉 Successfully connected ${edgeCount} relationships in ERD!`);
  }

  return edges;
}
