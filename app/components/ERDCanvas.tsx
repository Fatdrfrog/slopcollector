import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { TableNode, type TableNodeData } from './TableNode';
import { KeyboardHints } from './KeyboardHints';
import { RelayoutButton } from './RelayoutButton';
import type { Table, Suggestion } from '../types';
import { useGraphLayout } from '../hooks/useGraphLayout';
import { GRAPH_CONFIG } from '../utils/graphConfig';

interface ERDCanvasProps {
  tables: Table[];
  selectedTable: string | null;
  onTableSelect: (id: string | null) => void;
  suggestions?: Suggestion[];
}

function ERDCanvasInner({ tables, selectedTable, onTableSelect, suggestions = [] }: ERDCanvasProps) {
  const { fitView, getNode } = useReactFlow();
  
  // Use custom hook for all layout logic - eliminates 80+ lines of duplicate code
  const { nodes: layoutNodes, edges: layoutEdges, relayout } = useGraphLayout(tables, suggestions);
  
  // React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Update nodes/edges when layout changes (tables/suggestions change)
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  // Fast update: Only update selection state without recalculating layout
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data) return node;

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
            onSelect: onTableSelect, // Update callback
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
          duration: GRAPH_CONFIG.animation.fitViewDuration,
          padding: GRAPH_CONFIG.animation.selectionPadding,
          maxZoom: GRAPH_CONFIG.animation.maxZoom,
        });
      }
    }
  }, [selectedTable, onTableSelect, setNodes, getNode, fitView]);

  // Memoize node types to prevent recreation
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      tableNode: TableNode,
    }),
    []
  );

  // Handle pane click to deselect
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

  // Handle manual relayout with fit view
  const handleRelayout = useCallback(() => {
    relayout();
    
    // Fit view after layout is complete
    setTimeout(() => {
      fitView({ 
        padding: GRAPH_CONFIG.animation.fitViewPadding, 
        duration: GRAPH_CONFIG.animation.fitViewDuration 
      });
    }, GRAPH_CONFIG.animation.layoutTransitionDelay);
  }, [relayout, fitView]);

  // Minimap node coloring based on state
  const getMiniMapNodeColor = useCallback((node: Node<TableNodeData>) => {
    if (!node.data) {
      return GRAPH_CONFIG.colors.default;
    }

    const { isSelected, hasAIIssues, hasSchemaIssues } = node.data;

    if (isSelected) return GRAPH_CONFIG.colors.selected;
    if (hasAIIssues) return GRAPH_CONFIG.colors.aiIssue;
    if (hasSchemaIssues) return GRAPH_CONFIG.colors.schemaIssue;

    return GRAPH_CONFIG.colors.default;
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
        fitViewOptions={{ 
          padding: GRAPH_CONFIG.animation.fitViewPadding, 
          maxZoom: GRAPH_CONFIG.animation.maxZoom 
        }}
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
