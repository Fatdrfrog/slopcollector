import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '../components/TableNode';

/**
 * Auto-layout tables using dagre graph layout
 * Based on: https://reactflow.dev/examples/layout/dagre
 */
export function getLayoutedElements(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 350;
  const nodeHeight = 200; // Base height, actual varies by column count
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 120,  // Horizontal spacing between nodes
    ranksep: 200,  // Vertical spacing between ranks (more space for readability)
    edgesep: 60,   // Spacing between edges
    marginx: 100,  // More margin for breathing room
    marginy: 100,
    align: 'UL',   // Align upper-left for consistent layout
  });

  // Add nodes to graph with dynamic heights based on column count
  nodes.forEach((node) => {
    const columnCount = node.data?.table?.columns?.length || 5;
    const dynamicHeight = Math.max(200, 100 + columnCount * 28); // ~28px per column
    
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: dynamicHeight 
    });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

