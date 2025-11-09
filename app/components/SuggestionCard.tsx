import { AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { Suggestion } from '../types';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onSelectTable?: (tableId: string) => void;
}

function getSeverityIcon(severity: Suggestion['severity']) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-600" />;
  }
}

function getSeverityStyles(severity: Suggestion['severity']) {
  switch (severity) {
    case 'error':
      return 'bg-red-950/30 border-red-900';
    case 'warning':
      return 'bg-amber-950/30 border-amber-900';
    case 'info':
      return 'bg-blue-950/30 border-blue-900';
  }
}

/**
 * Individual suggestion card component
 */
export function SuggestionCard({ suggestion, onSelectTable }: SuggestionCardProps) {
  const handleClick = () => {
    if (onSelectTable && suggestion.tableId) {
      onSelectTable(suggestion.tableId);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3.5 rounded-xl border backdrop-blur-sm ${getSeverityStyles(suggestion.severity)} transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer group`}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {getSeverityIcon(suggestion.severity)}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-gray-100 leading-snug group-hover:text-white transition-colors">
            {suggestion.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            <code className="bg-[#0f0f0f] px-1.5 py-0.5 rounded text-xs text-gray-300 font-mono group-hover:text-[#7ed321] transition-colors">
              {suggestion.tableName}
            </code>
            {suggestion.columnName && (
              <>
                <span className="text-gray-700">→</span>
                <code className="bg-[#0f0f0f] px-1.5 py-0.5 rounded text-xs text-indigo-400 font-mono">
                  {suggestion.columnName}
                </code>
              </>
            )}
          </p>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-xs text-gray-300 mb-2.5 leading-relaxed">
        {suggestion.description}
      </p>
      
      {/* Impact/Action */}
      {suggestion.impact && (
        <div className="flex items-start gap-2 text-xs text-gray-400 bg-[#0f0f0f]/80 px-3 py-2 rounded-lg font-mono border border-gray-800/50 group-hover:border-gray-700/80 transition-colors">
          <span className="text-indigo-500 opacity-60 flex-shrink-0">$</span>
          <span className="flex-1 leading-relaxed">{suggestion.impact}</span>
        </div>
      )}
    </div>
  );
}
