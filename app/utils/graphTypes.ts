import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '../components/TableNode';

/**
 * Type-safe cache key for graph operations
 */
export type GraphCacheKey = `${string}-${number}`;

/**
 * Layout direction for dagre graph
 */
export type LayoutDirection = 'TB' | 'LR';

/**
 * Handle positions for React Flow connections
 */
export type HandlePosition = 'top' | 'bottom' | 'left' | 'right';
export type TargetHandlePosition = 'top-target' | 'bottom-target' | 'left-target' | 'right-target';

/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Result of layout calculation
 */
export interface LayoutResult {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  nodePositions: Map<string, Position>;
}

/**
 * Handle positions for edge connections
 */
export interface HandlePositions {
  sourceHandle: HandlePosition;
  targetHandle: TargetHandlePosition;
}
