import { Key, Link } from 'lucide-react';
import type { Column } from '../types';
import { isColumnUnused, needsIndex } from '../utils/tableAnalysis';

interface ColumnRowProps {
  column: Column;
  isLast: boolean;
}

/**
 * Single column row in a table node
 */
export function ColumnRow({ column, isLast }: ColumnRowProps) {
  const unused = isColumnUnused(column);
  const missingIndex = needsIndex(column);

  return (
    <div
      className={`relative px-4 py-2.5 flex items-center justify-between transition-colors ${
        unused || missingIndex ? 'bg-amber-950/10' : 'hover:bg-gray-900/30'
      } ${!isLast ? 'border-b border-gray-800/50' : ''}`}
    >
      {/* Column name with icons */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {column.primaryKey && (
            <div className="p-1 bg-yellow-950/30 rounded">
              <Key className="w-3 h-3 text-yellow-500" />
            </div>
          )}
          {column.foreignKey && (
            <div className="p-1 bg-indigo-950/30 rounded">
              <Link className="w-3 h-3 text-indigo-400" />
            </div>
          )}
        </div>
        <span className="text-sm text-gray-200 font-mono truncate">
          {column.name}
        </span>
      </div>
      
      {/* Column metadata and badges */}
      <div className="flex items-center gap-2 ml-3">
        {missingIndex && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-950/30 border border-amber-900/40 rounded text-xs text-amber-400">
            No index
          </div>
        )}
        {unused && (
          <div className="px-2 py-0.5 bg-gray-800/50 border border-gray-700 rounded text-xs text-gray-500">
            Unused
          </div>
        )}
        <span className="text-xs text-gray-500 font-mono truncate max-w-[100px]">
          {column.type}
        </span>
      </div>
    </div>
  );
}
