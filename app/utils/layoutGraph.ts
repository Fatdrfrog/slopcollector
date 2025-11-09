import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TableNodeData } from '../components/TableNode';

/**
 * Auto-layout tables using dagre graph layout for proper ERD visualization
 * Creates hierarchical layout based on foreign key relationships
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
  const baseNodeHeight = 200;
  
  // Configure dagre for better ERD layout
  // With edges, creates proper hierarchical layout (parent tables above children)
  // Without edges, falls back to grid layout
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: edges.length > 0 ? 250 : 150,
    ranksep: edges.length > 0 ? 350 : 250,
    edgesep: 150,
    marginx: 220,
    marginy: 220,
    align: edges.length > 0 ? 'UL' : 'DL',
    acyclicer: 'greedy',
    ranker: edges.length > 0 ? 'tight-tree' : 'network-simplex',
  });
  
  console.log(`📐 Layout config: ${edges.length} edges, ${nodes.length} nodes, direction: ${direction}`);

  // Add nodes to graph with dynamic heights based on column count
  nodes.forEach((node) => {
    const columnCount = node.data?.table?.columns?.length || 5;
    const dynamicHeight = Math.max(baseNodeHeight, 100 + columnCount * 28); // ~28px per column
    
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
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
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - (nodeWithPosition.height || baseNodeHeight) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges, nodePositions };
}

