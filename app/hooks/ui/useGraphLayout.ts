import { useMemo, useCallback, useState } from 'react';
import type { Table, Suggestion } from '@/lib/types';
import { generateNodesFromTables } from '@/app/utils/nodeGenerator';
import { generateEdgesFromTables } from '@/app/utils/edgeGenerator';
import { getLayoutedElements } from '@/app/utils/layoutGraph';
import { GraphCache } from '@/app/utils/graphCache';

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
