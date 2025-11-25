import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '@/app/components/TableNode';
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


  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.target, edge.source);
  });

  dagre.layout(dagreGraph);

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
