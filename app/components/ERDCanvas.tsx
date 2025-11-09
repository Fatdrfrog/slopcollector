import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode, type TableNodeData } from './TableNode';
import { KeyboardHints } from './KeyboardHints';
import { RelayoutButton } from './RelayoutButton';
import { generateNodesFromTables } from '../utils/nodeGenerator';
import { generateEdgesFromTables } from '../utils/edgeGenerator';
import { getLayoutedElements } from '../utils/layoutGraph';
import { hasTableIssues } from '../utils/tableAnalysis';
import type { Table } from '../types';

interface ERDCanvasProps {
  tables: Table[];
  selectedTable: string | null;
  onTableSelect: (id: string | null) => void;
}

function ERDCanvasInner({ tables, selectedTable, onTableSelect }: ERDCanvasProps) {
  const { fitView, getNode } = useReactFlow();
  
  // Memoize onTableSelect to prevent unnecessary re-renders
  const memoizedOnTableSelect = useCallback(onTableSelect, [onTableSelect]);

  // Only regenerate layout when tables structure changes (not when selection changes)
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = generateNodesFromTables(tables, selectedTable, memoizedOnTableSelect);
    const edges = generateEdgesFromTables(tables);
    
    console.log(`🔗 Generating layout with ${edges.length} edges`);
    
    const layouted = getLayoutedElements(nodes, edges, 'TB');
    
    return {
      initialNodes: layouted.nodes,
      initialEdges: layouted.edges,
    };
  }, [tables, memoizedOnTableSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Only regenerate layout when tables array actually changes
  useEffect(() => {
    const newNodes = generateNodesFromTables(tables, selectedTable, memoizedOnTableSelect);
    const newEdges = generateEdgesFromTables(tables);
    
    console.log(`🔄 Layout update: ${newEdges.length} edges`);
    
    const layouted = getLayoutedElements(newNodes, newEdges, 'TB');
    
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [tables, memoizedOnTableSelect, setNodes, setEdges]);

  // Fast update: Only update selection state without recalculating layout
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data) {
          return node;
        }

        const isSelected = selectedTable === node.id;
        
        // Only update if selection state changed
        if (node.data.isSelected === isSelected) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            isSelected,
          },
        };
      })
    );

    // Focus on selected table
    if (selectedTable) {
      const node = getNode(selectedTable);
      if (node) {
        // Center and zoom to the selected table
        fitView({
          nodes: [node],
          duration: 400,
          padding: 0.5,
          maxZoom: 1,
        });
      }
    }
  }, [selectedTable, setNodes, getNode, fitView]);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      tableNode: TableNode,
    }),
    []
  );

  const handlePaneClick = useCallback(() => {
    onTableSelect(null);
  }, [onTableSelect]);

  const handleRelayout = useCallback(() => {
    const newNodes = generateNodesFromTables(tables, selectedTable, memoizedOnTableSelect);
    const newEdges = generateEdgesFromTables(tables);
    
    console.log(`♻️ Manual relayout: ${newEdges.length} edges`);
    
    const layouted = getLayoutedElements(newNodes, newEdges, 'TB');
    
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    
    // Fit view after relayout
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 100);
  }, [tables, selectedTable, memoizedOnTableSelect, setNodes, setEdges, fitView]);

  const getMiniMapNodeColor = useCallback((node: Node<TableNodeData>) => {
    if (!node.data) {
      return '#3a3a3a';
    }

    const { table, isSelected } = node.data;
    const hasIssues = hasTableIssues(table);

    if (isSelected) return '#7ed321';     
    if (hasIssues) return '#ff6b6b';     

    return '#3a3a3a'; 
  }, []);

  return (
    <div className="w-full h-full bg-[#0f0f0f] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={20}
          size={2}
          color="#1f1f1f"
          variant={BackgroundVariant.Dots}
          style={{ backgroundColor: '#0f0f0f' }}
        />
        
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-lg"
          maskColor="rgb(15, 15, 15, 0.7)"
          position="bottom-right"
          pannable
          zoomable
        />
      </ReactFlow>

      <RelayoutButton onRelayout={handleRelayout} />
      <KeyboardHints />
    </div>
  );
}

export function ERDCanvas(props: ERDCanvasProps) {
  return (
    <ReactFlowProvider>
      <ERDCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
