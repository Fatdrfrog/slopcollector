import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '../components/TableNode';
import type { LayoutResult, LayoutDirection } from './graphTypes';
import { GRAPH_CONFIG } from './graphConfig';

/**
 * Auto-layout tables using dagre graph layout for proper ERD visualization
 * Creates hierarchical layout based on foreign key relationships
 * 
 * @param nodes - React Flow nodes to layout
 * @param edges - React Flow edges defining relationships
 * @param direction - Layout direction ('TB' = top-to-bottom, 'LR' = left-to-right)
 * @returns Layout result with positioned nodes, edges, and position map
 * 
 * @example
 * const result = getLayoutedElements(nodes, edges, 'TB');
 * setNodes(result.nodes);
 * setEdges(result.edges);
 * 
 * Based on: https://reactflow.dev/examples/layout/dagre
 */
export function getLayoutedElements(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  direction: LayoutDirection = 'TB'
): LayoutResult {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const { node: nodeConfig, layout: layoutConfig } = GRAPH_CONFIG;
  const hasEdges = edges.length > 0;
  
  // Configure dagre for better ERD layout
  // With edges: creates proper hierarchical layout (parent tables above children)
  // Without edges: falls back to grid layout
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: hasEdges ? layoutConfig.nodesep.withEdges : layoutConfig.nodesep.withoutEdges,
    ranksep: hasEdges ? layoutConfig.ranksep.withEdges : layoutConfig.ranksep.withoutEdges,
    edgesep: layoutConfig.edgesep,
    marginx: layoutConfig.marginx,
    marginy: layoutConfig.marginy,
    align: hasEdges ? 'UL' : 'DL',
    acyclicer: 'greedy',
    ranker: hasEdges ? 'tight-tree' : 'network-simplex',
  });
  
  console.log(`📐 Layout config: ${edges.length} edges, ${nodes.length} nodes, direction: ${direction}`);

  // Add nodes to graph with dynamic heights based on column count
  nodes.forEach((node) => {
    const columnCount = node.data?.table?.columns?.length || 5;
    const dynamicHeight = Math.max(
      nodeConfig.baseHeight, 
      100 + columnCount * nodeConfig.columnHeight
    );
    
    dagreGraph.setNode(node.id, { 
      width: nodeConfig.width, 
      height: dynamicHeight 
    });
  });

  // Add edges to graph
  // Note: In React Flow, edges go FROM source TO target
  // For FK relationships: child table (source) → parent table (target)
  // For dagre layout with TB direction: we want parent above child
  // So we reverse the edge direction for dagre layout only
  edges.forEach((edge) => {
    // Reverse edge for dagre: parent → child (so parent appears above)
    // React Flow will still render the visual edge correctly (child → parent)
    dagreGraph.setEdge(edge.target, edge.source);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const nodePositions = new Map<string, { x: number; y: number }>();
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    nodePositions.set(node.id, { x: nodeWithPosition.x, y: nodeWithPosition.y });

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeConfig.width / 2,
        y: nodeWithPosition.y - (nodeWithPosition.height || nodeConfig.baseHeight) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges, nodePositions };
}
