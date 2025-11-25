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
import { TableNode, type TableNodeData } from './TableNode';
import { KeyboardHints } from './KeyboardHints';
import { RelayoutButton } from './RelayoutButton';
import type { Table, Suggestion } from '@/lib/types';
import { useGraphLayout } from '@/hooks/ui/useGraphLayout';
import { GRAPH_CONFIG } from '@/app/utils/graphConfig';

interface ERDCanvasProps {
  tables: Table[];
  selectedTable: string | null;
  onTableSelect: (id: string | null) => void;
  suggestions?: Suggestion[];
}

function ERDCanvasInner({ tables, selectedTable, onTableSelect, suggestions = [] }: ERDCanvasProps) {
  const { fitView, getNode } = useReactFlow();
  
  const { nodes: layoutNodes, edges: layoutEdges, relayout } = useGraphLayout(tables, suggestions);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data) return node;

        const isSelected = selectedTable === node.id;
        
        if (node.data.isSelected === isSelected) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            isSelected,
            onSelect: onTableSelect,
          },
        };
      })
    );

    if (selectedTable) {
      const node = getNode(selectedTable);
      if (node) {
        fitView({
          nodes: [node],
          duration: GRAPH_CONFIG.animation.fitViewDuration,
          padding: GRAPH_CONFIG.animation.selectionPadding,
          maxZoom: GRAPH_CONFIG.animation.maxZoom,
        });
      }
    }
  }, [selectedTable, onTableSelect, setNodes, getNode, fitView]);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      tableNode: TableNode,
    }),
    []
  );

  const handlePaneClick = useCallback(() => {
    onTableSelect(null);
  }, [onTableSelect]);

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const sourceNode = getNode(connection.source);
    const targetNode = getNode(connection.target);
    
    if (!sourceNode || !targetNode) {
      return false;
    }
    
    const validSourceHandles = ['left', 'right', 'top', 'bottom'];
    const validTargetHandles = ['left-target', 'right-target', 'top-target', 'bottom-target'];
    
    const hasValidSourceHandle = connection.sourceHandle === undefined || 
                                 connection.sourceHandle === null ||
                                 validSourceHandles.includes(connection.sourceHandle);
    const hasValidTargetHandle = connection.targetHandle === undefined || 
                                 connection.targetHandle === null ||
                                 validTargetHandles.includes(connection.targetHandle);
    
    return hasValidSourceHandle && hasValidTargetHandle;
  }, [getNode]);

  const handleRelayout = useCallback(() => {
    relayout();
    
    setTimeout(() => {
      fitView({ 
        padding: GRAPH_CONFIG.animation.fitViewPadding, 
        duration: GRAPH_CONFIG.animation.fitViewDuration 
      });
    }, GRAPH_CONFIG.animation.layoutTransitionDelay);
  }, [relayout, fitView]);
  
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
          color="#333"
          variant={BackgroundVariant.Dots}
          className="bg-background"
        />
        
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          nodeBorderRadius={4}
          className="!bg-card !border-border shadow-lg"
          maskColor="rgba(0, 0, 0, 0.6)"
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
