import { memo, type MouseEvent } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Copy, ExternalLink, Maximize2 } from 'lucide-react';
import type { Table } from '@/lib/types';
import { countCriticalIssues } from '@/app/utils/tableAnalysis';
import { TableNodeHeader } from './TableNodeHeader';
import { ColumnRow } from './ColumnRow';
import { Button } from './ui/button';
import { toast } from 'sonner';

export interface TableNodeData extends Record<string, unknown> {
  table: Table;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  hasAIIssues: boolean;
  hasSchemaIssues: boolean;
}

type TableNodeRFNode = Node<TableNodeData>;

type TableNodeProps = NodeProps<TableNodeRFNode>;


function arePropsEqual(prev: TableNodeProps, next: TableNodeProps): boolean {
  return (
    prev.data.isSelected === next.data.isSelected &&
    prev.data.table.id === next.data.table.id &&
    prev.data.hasAIIssues === next.data.hasAIIssues &&
    prev.data.hasSchemaIssues === next.data.hasSchemaIssues &&
    prev.data.table.columns.length === next.data.table.columns.length
  );
}


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
        className={`relative bg-card text-card-foreground rounded-xl shadow-sm transition-all duration-200 ${
          isSelected 
            ? `ring-2 ring-ring shadow-lg shadow-primary/20` 
            : hasAIIssues 
              ? `ring-2 ring-destructive/80 shadow-lg shadow-destructive/20` 
              : hasSchemaIssues
                ? `ring-2 ring-yellow-500/60 shadow-lg shadow-yellow-500/10`
                : 'ring-1 ring-border hover:ring-ring/50'
        }`}
        style={{ minWidth: '320px' }}
        onClick={handleClick}
      >
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-200 ${
        isSelected 
          ? `from-primary via-primary/50 to-primary opacity-10` 
          : hasAIIssues 
            ? `from-destructive via-destructive/50 to-destructive opacity-10` 
            : hasSchemaIssues
              ? `from-yellow-500 via-yellow-500/50 to-yellow-500 opacity-10`
              : ''
      }`} />

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

      <TableNodeHeader 
        table={table} 
        isSelected={isSelected} 
        criticalIssues={criticalIssues} 
      />

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

export const TableNode = memo(TableNodeComponent, arePropsEqual);

TableNode.displayName = 'TableNode';

