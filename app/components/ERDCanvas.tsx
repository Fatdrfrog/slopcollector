import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableNode } from './TableNode';
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

/**
 * Main canvas component for the ERD diagram using React Flow
 */
export function ERDCanvas({ tables, selectedTable, onTableSelect }: ERDCanvasProps) {
  // Generate nodes and edges from tables
  const initialNodes = useMemo(
    () => generateNodesFromTables(tables, selectedTable, onTableSelect),
    [tables]
  );

  const initialEdges = useMemo(
    () => generateEdgesFromTables(tables),
    [tables]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when selection changes
  useMemo(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: selectedTable === node.id,
        },
      }))
    );
  }, [selectedTable, setNodes]);

  // Define custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      tableNode: TableNode,
    }),
    []
  );

  // Handle clicking on empty canvas
  const handlePaneClick = useCallback(() => {
    onTableSelect(null);
  }, [onTableSelect]);

  // Mini-map node coloring based on status
  const getMiniMapNodeColor = useCallback((node: any) => {
    const table = node.data.table as Table;
    const hasIssues = hasTableIssues(table);
    
    if (node.data.isSelected) return '#6366f1';
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
          variant="dots"
          style={{ backgroundColor: '#0f0f0f' }}
        />
        
        <MiniMap
          nodeColor={getMiniMapNodeColor}
          className="bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-lg"
          maskColor="rgb(15, 15, 15, 0.7)"
          position="bottom-right"
        />
      </ReactFlow>

      <KeyboardHints />
    </div>
  );
}
