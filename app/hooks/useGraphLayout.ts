import { useMemo, useCallback, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { Table, Suggestion } from '../types';
import type { TableNodeData } from '../components/TableNode';
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

  /**
   * Generate and layout nodes/edges
   * Only recalculates when tables or suggestions change
   */
  const { nodes, edges } = useMemo(() => {
    const cache = GraphCache.getInstance();
    const cacheKey = `layout-${tables.length}-${suggestions.length}-${layoutVersion}`;
    
    // Check cache first
    const cachedLayout = cache.getCachedLayout(cacheKey);
    if (cachedLayout) {
      console.log('📦 Using cached layout');
      return {
        nodes: cachedLayout.nodes,
        edges: cachedLayout.edges,
      };
    }

    console.log('🔄 Calculating new layout...');
    
    // Generate nodes (without selection state - that's handled separately)
    const baseNodes = generateNodesFromTables(tables, null, () => {}, suggestions);
    
    // Generate base edges
    const baseEdges = generateEdgesFromTables(tables);
    
    // Calculate layout
    const layoutResult = getLayoutedElements(baseNodes, baseEdges, 'TB');
    
    // Generate oriented edges with proper handle positions
    const orientedEdges = generateEdgesFromTables(tables, layoutResult.nodePositions);
    
    const result = {
      nodes: layoutResult.nodes,
      edges: orientedEdges,
    };

    // Cache the result
    cache.setCachedLayout(cacheKey, {
      ...layoutResult,
      edges: orientedEdges,
    });

    return result;
  }, [tables, suggestions, layoutVersion]);

  /**
   * Force a relayout (e.g., when user clicks relayout button)
   */
  const relayout = useCallback(() => {
    console.log('♻️ Manual relayout triggered');
    setLayoutVersion(v => v + 1);
  }, []);

  /**
   * Invalidate cache when tables change significantly
   */
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
