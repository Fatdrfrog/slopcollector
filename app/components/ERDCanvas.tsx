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
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode, type TableNodeData } from './TableNode';
import { KeyboardHints } from './KeyboardHints';
import { RelayoutButton } from './RelayoutButton';
import { generateNodesFromTables } from '../utils/nodeGenerator';
import { generateEdgesFromTables } from '../utils/edgeGenerator';
import { getLayoutedElements } from '../utils/layoutGraph';
import { hasTableIssues } from '../utils/tableAnalysis';
import type { Table, Suggestion } from '../types';

interface ERDCanvasProps {
  tables: Table[];
  selectedTable: string | null;
  onTableSelect: (id: string | null) => void;
  suggestions?: Suggestion[];
}

function ERDCanvasInner({ tables, selectedTable, onTableSelect, suggestions = [] }: ERDCanvasProps) {
  const { fitView, getNode } = useReactFlow();
  
  // Memoize onTableSelect to prevent unnecessary re-renders
  const memoizedOnTableSelect = useCallback(onTableSelect, [onTableSelect]);

  // Only regenerate layout when tables structure changes (not when selection changes)
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = generateNodesFromTables(tables, selectedTable, memoizedOnTableSelect, suggestions);
    const baseEdges = generateEdgesFromTables(tables);

    console.log(`🔗 Generating layout with ${baseEdges.length} edges`);

    const layouted = getLayoutedElements(nodes, baseEdges, 'TB');
    const orientedEdges = generateEdgesFromTables(tables, layouted.nodePositions);

    return {
      initialNodes: layouted.nodes,
      initialEdges: orientedEdges,
    };
  }, [tables, memoizedOnTableSelect, suggestions]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Only regenerate layout when tables array actually changes
  useEffect(() => {
    const newNodes = generateNodesFromTables(tables, selectedTable, memoizedOnTableSelect, suggestions);
    const baseEdges = generateEdgesFromTables(tables);

    console.log(`🔄 Layout update: ${baseEdges.length} edges`);

    const layouted = getLayoutedElements(newNodes, baseEdges, 'TB');
    const orientedEdges = generateEdgesFromTables(tables, layouted.nodePositions);

    // Batch updates using requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      setNodes(layouted.nodes);
      setEdges(orientedEdges);
    });
  }, [tables, memoizedOnTableSelect, suggestions, setNodes, setEdges]);

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

  // Validate edge connections to prevent errors with missing handles
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const sourceNode = getNode(connection.source);
    const targetNode = getNode(connection.target);
    
    // Ensure both nodes exist
    if (!sourceNode || !targetNode) {
      return false;
    }
    
    // Valid handle IDs
    const validSourceHandles = ['left', 'right', 'top', 'bottom'];
    const validTargetHandles = ['left-target', 'right-target', 'top-target', 'bottom-target'];
    
    // Validate handles exist (handle undefined as valid)
    const hasValidSourceHandle = connection.sourceHandle === undefined || 
                                 connection.sourceHandle === null ||
                                 validSourceHandles.includes(connection.sourceHandle);
    const hasValidTargetHandle = connection.targetHandle === undefined || 
                                 connection.targetHandle === null ||
                                 validTargetHandles.includes(connection.targetHandle);
    
    return hasValidSourceHandle && hasValidTargetHandle;
  }, [getNode]);

  const handleRelayout = useCallback(() => {
    const newNodes = generateNodesFromTables(tables, selectedTable, memoizedOnTableSelect, suggestions);
    const baseEdges = generateEdgesFromTables(tables);

    console.log(`♻️ Manual relayout: ${baseEdges.length} edges`);

    const layouted = getLayoutedElements(newNodes, baseEdges, 'TB');
    const orientedEdges = generateEdgesFromTables(tables, layouted.nodePositions);

    // Batch updates using requestAnimationFrame
    requestAnimationFrame(() => {
      setNodes(layouted.nodes);
      setEdges(orientedEdges);
      
      // Fit view after layout is complete
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 50);
    });
  }, [tables, selectedTable, memoizedOnTableSelect, suggestions, setNodes, setEdges, fitView]);

  const getMiniMapNodeColor = useCallback((node: Node<TableNodeData>) => {
    if (!node.data) {
      return '#3a3a3a';
    }

    const { isSelected, hasAIIssues, hasSchemaIssues } = node.data;

    if (isSelected) return '#7ed321';           // Green for selected
    if (hasAIIssues) return '#ff6b6b';          // Red for AI issues
    if (hasSchemaIssues) return '#f7b731';      // Orange for schema issues

    return '#3a3a3a';  // Gray default
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
        isValidConnection={isValidConnection}
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
          nodeBorderRadius={4}
          className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-lg"
          maskColor="rgb(15, 15, 15, 0.8)"
          position="bottom-right"
          pannable
          zoomable
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #3a3a3a',
          }}
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
