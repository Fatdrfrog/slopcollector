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
import { GRAPH_CONFIG } from '../utils/graphConfig';

export interface TableNodeData extends Record<string, unknown> {
  table: Table;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  hasAIIssues: boolean;
  hasSchemaIssues: boolean;
}

type TableNodeRFNode = Node<TableNodeData>;

type TableNodeProps = NodeProps<TableNodeRFNode>;

/**
 * Custom comparison function for TableNode memo
 * Only re-render when data that affects visual output changes
 */
function arePropsEqual(prev: TableNodeProps, next: TableNodeProps): boolean {
  return (
    prev.data.isSelected === next.data.isSelected &&
    prev.data.table.id === next.data.table.id &&
    prev.data.hasAIIssues === next.data.hasAIIssues &&
    prev.data.hasSchemaIssues === next.data.hasSchemaIssues &&
    prev.data.table.columns.length === next.data.table.columns.length
  );
}

/**
 * Custom React Flow node representing a database table
 * Memoized to prevent unnecessary re-renders on parent updates
 */
const TableNodeComponent = ({ data }: TableNodeProps) => {
  const { table, isSelected, onSelect, hasAIIssues, hasSchemaIssues } = data;
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
            ? `ring-2 ring-[${GRAPH_CONFIG.colors.selected}] shadow-[${GRAPH_CONFIG.colors.selected}]/30` 
            : hasAIIssues 
              ? `ring-2 ring-[${GRAPH_CONFIG.colors.aiIssue}]/80 shadow-[${GRAPH_CONFIG.colors.aiIssue}]/20` 
              : hasSchemaIssues
                ? `ring-2 ring-[${GRAPH_CONFIG.colors.schemaIssue}]/60 shadow-[${GRAPH_CONFIG.colors.schemaIssue}]/10`
                : 'ring-1 ring-[#3a3a3a]'
        }`}
        style={{ minWidth: '320px' }}
        onClick={handleClick}
      >
      {/* Gradient border effect for selected/issue states */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-200 ${
        isSelected 
          ? `from-[${GRAPH_CONFIG.colors.selected}] via-[#6bc916] to-[${GRAPH_CONFIG.colors.selected}] opacity-20` 
          : hasAIIssues 
            ? `from-[${GRAPH_CONFIG.colors.aiIssue}] via-[#ff8787] to-[${GRAPH_CONFIG.colors.aiIssue}] opacity-15` 
            : hasSchemaIssues
              ? `from-[${GRAPH_CONFIG.colors.schemaIssue}] via-[#ffc857] to-[${GRAPH_CONFIG.colors.schemaIssue}] opacity-10`
              : ''
      }`} />

      {/* Connection handles for edges - bidirectional for smart routing */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
        style={{ opacity: 0 }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
        style={{ opacity: 0 }}
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top-target" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
        style={{ opacity: 0 }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target" 
        className="w-3 h-3 !bg-[#7ed321] !border-2 !border-[#6bc916] shadow-lg shadow-[#7ed321]/50" 
        style={{ opacity: 0 }}
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
};

/**
 * Export memoized version with custom comparison
 */
export const TableNode = memo(TableNodeComponent, arePropsEqual);

TableNode.displayName = 'TableNode';

