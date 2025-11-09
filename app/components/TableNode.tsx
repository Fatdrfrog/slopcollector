import { memo, type MouseEvent } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Copy, ExternalLink, Maximize2 } from 'lucide-react';
import type { Table } from '../types';
import { hasTableIssues, countCriticalIssues } from '../utils/tableAnalysis';
import { TableNodeHeader } from './TableNodeHeader';
import { ColumnRow } from './ColumnRow';
import { Button } from './ui/button';
import { toast } from 'sonner';

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

  const handleCopyTableName = () => {
    navigator.clipboard.writeText(table.name);
    toast.success('Table name copied to clipboard');
  };

  const handleCopySQL = () => {
    const sql = `SELECT * FROM ${table.name} LIMIT 10;`;
    navigator.clipboard.writeText(sql);
    toast.success('SQL query copied to clipboard');
  };

  return (
    <>
      {/* NodeToolbar - appears when node is selected */}
      <NodeToolbar
        isVisible={isSelected}
        position={Position.Top}
        className="flex gap-1 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-1 shadow-xl"
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopyTableName}
          className="h-7 px-2 text-xs text-[#999] hover:text-white hover:bg-[#2a2a2a]"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy Name
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopySQL}
          className="h-7 px-2 text-xs text-[#999] hover:text-white hover:bg-[#2a2a2a]"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Copy SQL
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toast.info('Full details view coming soon')}
          className="h-7 px-2 text-xs text-[#999] hover:text-white hover:bg-[#2a2a2a]"
        >
          <Maximize2 className="w-3 h-3 mr-1" />
          Expand
        </Button>
      </NodeToolbar>

      <div
        className={`relative bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-xl shadow-2xl transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-[#7ed321] shadow-[#7ed321]/30' 
            : hasIssues 
              ? 'ring-2 ring-[#ff6b6b]/50' 
              : 'ring-1 ring-[#3a3a3a]'
        }`}
        style={{ minWidth: '320px' }}
        onClick={handleClick}
      >
      {/* Gradient border effect for selected/issue states */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-200 ${
        isSelected 
          ? 'from-[#7ed321] via-[#6bc916] to-[#7ed321] opacity-20' 
          : hasIssues 
            ? 'from-[#ff6b6b] via-[#ff8787] to-[#ff6b6b] opacity-10' 
            : ''
      }`} />

      {/* Connection handles for edges */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
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
    </>
  );
});

TableNode.displayName = 'TableNode';
