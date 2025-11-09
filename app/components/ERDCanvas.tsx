import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode, type TableNodeData } from './TableNode';
import { KeyboardHints } from './KeyboardHints';
import { generateNodesFromTables } from '../utils/nodeGenerator';
import { generateEdgesFromTables } from '../utils/edgeGenerator';
import { hasTableIssues } from '../utils/tableAnalysis';
import type { Table } from '../types';

interface ERDCanvasProps {
  tables: Table[];
  selectedTable: string | null;
  onTableSelect: (id: string | null) => void;
}

export function ERDCanvas({ tables, selectedTable, onTableSelect }: ERDCanvasProps) {
  const initialNodes = useMemo(
    () => generateNodesFromTables(tables, selectedTable, onTableSelect),
    [tables, selectedTable, onTableSelect]
  );

  const initialEdges = useMemo(
    () => generateEdgesFromTables(tables),
    [tables]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            isSelected: selectedTable === node.id,
          },
        };
      })
    );
  }, [selectedTable, setNodes]);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      tableNode: TableNode,
    }),
    []
  );

  const handlePaneClick = useCallback(() => {
    onTableSelect(null);
  }, [onTableSelect]);

  const getMiniMapNodeColor = useCallback((node: Node<TableNodeData>) => {
    if (!node.data) {
      return '#404040';
    }

    const { table, isSelected } = node.data;
    const hasIssues = hasTableIssues(table);

    if (isSelected) return '#6366f1';
    if (hasIssues) return '#f59e0b';

    return '#404040';
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
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background
          gap={20}
          size={2}
          color="#1f1f1f"
          variant={BackgroundVariant.Dots}
          style={{ backgroundColor: '#0f0f0f' }}
        />
        
        <Controls 
          className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-lg"
          position="bottom-left"
          showInteractive={false}
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

      <KeyboardHints />
    </div>
  );
}
