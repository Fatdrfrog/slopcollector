import type { Edge } from '@xyflow/react';
import type { Table } from '../types';
import type { HandlePositions, Position } from './graphTypes';
import { needsIndex } from './tableAnalysis';
import { GraphCache } from './graphCache';
import { GRAPH_CONFIG } from './graphConfig';

function calculateHandlePositions(
  sourcePos: Position,
  targetPos: Position
): HandlePositions {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return { sourceHandle: 'right', targetHandle: 'left-target' };
    }
    return { sourceHandle: 'left', targetHandle: 'right-target' };
  }

  if (dy > 0) {
    return { sourceHandle: 'bottom', targetHandle: 'top-target' };
  }
  return { sourceHandle: 'top', targetHandle: 'bottom-target' };
}

function buildTableLookup(tables: Table[]): Map<string, string> {
  const cache = GraphCache.getInstance();
  const cacheKey = `table-lookup-${tables.length}`;
  
  const cached = cache.getCachedTableLookup(cacheKey);
  if (cached) return cached;

  const lookup = new Map<string, string>();
  tables.forEach((table) => {
    lookup.set(table.id.toLowerCase(), table.id);
    lookup.set(table.name.toLowerCase(), table.id);
  });

  cache.setCachedTableLookup(cacheKey, lookup);
  return lookup;
}

function resolveTargetTable(
  targetTableName: string,
  tableLookup: Map<string, string>
): string | undefined {
  const possibleNames = [
    targetTableName,
    `${targetTableName}s`,
    targetTableName.replace(/y$/, 'ies'),
    targetTableName.replace(/s$/, ''),
    targetTableName.replace(/ch$/, 'ches'),
    targetTableName.replace(/x$/, 'xes'),
    `${targetTableName}es`,
  ];

  for (const possibleName of possibleNames) {
    const found = tableLookup.get(possibleName.toLowerCase());
    if (found) return found;
  }

  return undefined;
}

export function generateEdgesFromTables(
  tables: Table[],
  nodePositions?: Map<string, Position>
): Edge[] {
  const cache = GraphCache.getInstance();
  const cacheKey = `edges-${tables.length}-${nodePositions ? 'positioned' : 'base'}`;
  
  const cached = cache.getCachedEdges(cacheKey);
  if (cached) return cached;

  const edges: Edge[] = [];
  const tableLookup = buildTableLookup(tables);
  const { colors } = GRAPH_CONFIG;

  let fkCount = 0;
  let edgeCount = 0;

  tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (!column.foreignKey) return;

      fkCount++;
      const parts = column.foreignKey.split('.');
      const targetTableName = parts[0];
      
      if (!targetTableName) {
        console.warn(`Invalid foreign key format: ${column.foreignKey}`);
        return;
      }
      
      const actualTargetId = resolveTargetTable(targetTableName, tableLookup);

      if (!actualTargetId) {
        console.warn(
          `FK reference to missing table: ${table.name}.${column.name} → ${targetTableName}`
        );
        return;
      }

      edgeCount++;
      const isMissingIndex = needsIndex(column);
      
      const defaultHandles: HandlePositions = { 
        sourceHandle: 'bottom', 
        targetHandle: 'top-target' 
      };
      
      let handlePositions = defaultHandles;
      if (nodePositions) {
        const sourcePos = nodePositions.get(table.id);
        const targetPos = nodePositions.get(actualTargetId);
        
        if (sourcePos && targetPos) {
          handlePositions = calculateHandlePositions(sourcePos, targetPos);
        }
      }

      edges.push({
        id: `${table.id}-${column.name}-${actualTargetId}`,
        source: table.id,
        target: actualTargetId,
        sourceHandle: handlePositions.sourceHandle,
        targetHandle: handlePositions.targetHandle,
        animated: isMissingIndex,
        className: 'transition-all duration-200',
        style: {
          stroke: isMissingIndex ? colors.edge.missingIndex : colors.edge.normal,
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
          color: isMissingIndex ? colors.edge.missingIndex : colors.edge.normal,
        },
      });
    });
  });

  cache.setCachedEdges(cacheKey, edges);
  
  return edges;
}
