import { useMemo, useCallback, useState } from 'react';
import type { Table, Suggestion } from '../types';
import { generateNodesFromTables } from '../utils/nodeGenerator';
import { generateEdgesFromTables } from '../utils/edgeGenerator';
import { getLayoutedElements } from '../utils/layoutGraph';
import { GraphCache } from '../utils/graphCache';

/**
 * Custom hook for managing graph layout with optimized caching
 * Encapsulates all layout logic and provides a clean API for components
 * 
 * Features:
 * - Automatic memoization of expensive layout calculations
 * - Integration with singleton cache for cross-render optimization
 * - Separation of layout updates from selection updates
 * - Manual relayout function for user-triggered updates
 * 
 * @param tables - Array of tables to visualize
 * @param suggestions - AI suggestions for highlighting issues
 * @returns Graph state and control functions
 * 
 * @example
 * function MyComponent({ tables, suggestions }) {
 *   const { nodes, edges, relayout } = useGraphLayout(tables, suggestions);
 *   
 *   return (
 *     <ReactFlow nodes={nodes} edges={edges} />
 *     <button onClick={relayout}>Relayout</button>
 *   );
 * }
 */
export function useGraphLayout(
  tables: Table[],
  suggestions: Suggestion[] = []
) {
  const [layoutVersion, setLayoutVersion] = useState(0);

  const { nodes, edges } = useMemo(() => {
    const cache = GraphCache.getInstance();
    const cacheKey = `layout-${tables.length}-${suggestions.length}-${layoutVersion}`;
    
    const cachedLayout = cache.getCachedLayout(cacheKey);
    if (cachedLayout) {
      return {
        nodes: cachedLayout.nodes,
        edges: cachedLayout.edges,
      };
    }

    const baseNodes = generateNodesFromTables(tables, null, () => {}, suggestions);
    
    const baseEdges = generateEdgesFromTables(tables);
    
    const layoutResult = getLayoutedElements(baseNodes, baseEdges, 'TB');
    
    const orientedEdges = generateEdgesFromTables(tables, layoutResult.nodePositions);
    
    const result = {
      nodes: layoutResult.nodes,
      edges: orientedEdges,
    };

    cache.setCachedLayout(cacheKey, {
      ...layoutResult,
      edges: orientedEdges,
    });

    return result;
  }, [tables, suggestions, layoutVersion]);

  const relayout = useCallback(() => {
    setLayoutVersion(v => v + 1);
  }, []);

  const invalidateCache = useCallback(() => {
    const cache = GraphCache.getInstance();
    cache.invalidate();
  }, []);

  return {
    nodes,
    edges,
    relayout,
    invalidateCache,
  };
}
