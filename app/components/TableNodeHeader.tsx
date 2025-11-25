import { Table2, AlertCircle } from 'lucide-react';
import type { Table } from '@/lib/types';
import { formatRowCount } from '@/app/utils/tableAnalysis';

interface TableNodeHeaderProps {
  table: Table;
  isSelected: boolean;
  criticalIssues: number;
}

/**
 * Header section of a table node
 */
export function TableNodeHeader({ table, isSelected, criticalIssues }: TableNodeHeaderProps) {
  return (
    <div
      className={`relative px-4 py-3.5 border-b flex items-center justify-between rounded-t-xl ${
        isSelected 
          ? 'bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border-indigo-800/50' 
          : 'bg-[#0f0f0f]/60 border-gray-800/80'
      }`}
    >
      {/* Table name */}
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-500/20' : 'bg-gray-800/50'}`}>
          <Table2 className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-gray-400'}`} />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-100 font-medium">{table.name}</span>
          {table.rowCount && (
            <span className="text-xs text-gray-500">
              {formatRowCount(table.rowCount)} rows
            </span>
          )}
        </div>
      </div>
      
      {/* Issue badge */}
      {criticalIssues > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-950/30 border border-amber-900/50 rounded-md">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-400">{criticalIssues}</span>
        </div>
      )}
    </div>
  );
}
