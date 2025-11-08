import { memo, type MouseEvent } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { Table } from '../types';
import { hasTableIssues, countCriticalIssues } from '../utils/tableAnalysis';
import { TableNodeHeader } from './TableNodeHeader';
import { ColumnRow } from './ColumnRow';

export interface TableNodeData extends Record<string, unknown> {
  table: Table;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

type TableNodeRFNode = Node<TableNodeData>;

type TableNodeProps = NodeProps<TableNodeRFNode>;

/**
 * Custom React Flow node representing a database table
 */
export const TableNode = memo(({ data }: TableNodeProps) => {
  const { table, isSelected, onSelect } = data;
  const hasIssues = hasTableIssues(table);
  const criticalIssues = countCriticalIssues(table);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(table.id);
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-xl shadow-2xl transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-indigo-500 shadow-indigo-500/30' 
          : hasIssues 
            ? 'ring-2 ring-amber-500/50' 
            : 'ring-1 ring-gray-800'
      }`}
      style={{ minWidth: '320px' }}
      onClick={handleClick}
    >
      {/* Gradient border effect for selected/issue states */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-200 ${
        isSelected 
          ? 'from-indigo-500 via-purple-500 to-indigo-600 opacity-20' 
          : hasIssues 
            ? 'from-amber-500 via-orange-500 to-amber-600 opacity-10' 
            : ''
      }`} />

      {/* Connection handles for edges */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-indigo-400 shadow-lg shadow-indigo-500/50" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-indigo-400 shadow-lg shadow-indigo-500/50" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-indigo-400 shadow-lg shadow-indigo-500/50" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-indigo-400 shadow-lg shadow-indigo-500/50" 
      />

      {/* Header */}
      <TableNodeHeader 
        table={table} 
        isSelected={isSelected} 
        criticalIssues={criticalIssues} 
      />

      {/* Columns */}
      <div className="relative">
        {table.columns.map((column, index) => (
          <ColumnRow
            key={column.name}
            column={column}
            isLast={index === table.columns.length - 1}
          />
        ))}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
