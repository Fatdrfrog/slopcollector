import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '@/app/components/TableNode';
import type { LayoutResult } from './graphTypes';
import { GRAPH_CONFIG } from './graphConfig';

/**
 * Singleton cache manager for graph operations
 * Implements LRU cache to prevent memory leaks with large datasets
 * 
 * @example
 * const cache = GraphCache.getInstance();
 * const nodes = cache.getCachedNodes('tables-50-null');
 * if (!nodes) {
 *   const computed = computeNodes();
 *   cache.setCachedNodes('tables-50-null', computed);
 * }
 */
export class GraphCache {
  private static instance: GraphCache;
  
  private nodesCache = new Map<string, Node<TableNodeData>[]>();
  private edgesCache = new Map<string, Edge[]>();
  private layoutCache = new Map<string, LayoutResult>();
  private tableLookupCache = new Map<string, Map<string, string>>();
  
  // Track access order for LRU eviction
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): GraphCache {
    if (!GraphCache.instance) {
      GraphCache.instance = new GraphCache();
    }
    return GraphCache.instance;
  }

  /**
   * Get cached nodes by key
   */
  public getCachedNodes(key: string): Node<TableNodeData>[] | null {
    this.trackAccess(key);
    return this.nodesCache.get(key) ?? null;
  }

  /**
   * Set cached nodes
   */
  public setCachedNodes(key: string, nodes: Node<TableNodeData>[]): void {
    this.evictIfNeeded();
    this.nodesCache.set(key, nodes);
    this.trackAccess(key);
  }

  /**
   * Get cached edges by key
   */
  public getCachedEdges(key: string): Edge[] | null {
    this.trackAccess(key);
    return this.edgesCache.get(key) ?? null;
  }

  /**
   * Set cached edges
   */
  public setCachedEdges(key: string, edges: Edge[]): void {
    this.evictIfNeeded();
    this.edgesCache.set(key, edges);
    this.trackAccess(key);
  }

  /**
   * Get cached layout result
   */
  public getCachedLayout(key: string): LayoutResult | null {
    this.trackAccess(key);
    return this.layoutCache.get(key) ?? null;
  }

  /**
   * Set cached layout result
   */
  public setCachedLayout(key: string, layout: LayoutResult): void {
    this.evictIfNeeded();
    this.layoutCache.set(key, layout);
    this.trackAccess(key);
  }

  /**
   * Get cached table lookup map
   */
  public getCachedTableLookup(key: string): Map<string, string> | null {
    this.trackAccess(key);
    return this.tableLookupCache.get(key) ?? null;
  }

  /**
   * Set cached table lookup map
   */
  public setCachedTableLookup(key: string, lookup: Map<string, string>): void {
    this.evictIfNeeded();
    this.tableLookupCache.set(key, lookup);
    this.trackAccess(key);
  }

  /**
   * Invalidate cache entries matching pattern
   * @param pattern - Optional pattern to match keys (invalidates all if not provided)
   */
  public invalidate(pattern?: string): void {
    if (!pattern) {
      this.nodesCache.clear();
      this.edgesCache.clear();
      this.layoutCache.clear();
      this.tableLookupCache.clear();
      this.accessOrder.clear();
      return;
    }

    // Invalidate matching entries
    const keysToDelete: string[] = [];
    
    for (const key of this.nodesCache.keys()) {
      if (key.includes(pattern)) keysToDelete.push(key);
    }
    
    for (const key of keysToDelete) {
      this.nodesCache.delete(key);
      this.edgesCache.delete(key);
      this.layoutCache.delete(key);
      this.tableLookupCache.delete(key);
      this.accessOrder.delete(key);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  public getStats() {
    return {
      nodes: this.nodesCache.size,
      edges: this.edgesCache.size,
      layouts: this.layoutCache.size,
      tableLookups: this.tableLookupCache.size,
      totalEntries: this.accessOrder.size,
    };
  }

  /**
   * Track access for LRU eviction
   */
  private trackAccess(key: string): void {
    this.accessOrder.set(key, this.accessCounter++);
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictIfNeeded(): void {
    const maxSize = GRAPH_CONFIG.performance.maxCacheSize;
    
    if (this.accessOrder.size >= maxSize) {
      // Find least recently used key
      let lruKey: string | null = null;
      let lruTime = Infinity;
      
      for (const [key, time] of this.accessOrder.entries()) {
        if (time < lruTime) {
          lruTime = time;
          lruKey = key;
        }
      }
      
      if (lruKey) {
        this.nodesCache.delete(lruKey);
        this.edgesCache.delete(lruKey);
        this.layoutCache.delete(lruKey);
        this.tableLookupCache.delete(lruKey);
        this.accessOrder.delete(lruKey);
      }
    }
  }

  /**
   * Clear all caches (useful for testing)
   */
  public clear(): void {
    this.invalidate();
  }
}
