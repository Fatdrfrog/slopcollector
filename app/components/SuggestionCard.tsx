import { memo, useState } from 'react';
import { AlertCircle, Info, AlertTriangle, Code, FileCode, Check, X, RotateCcw } from 'lucide-react';
import type { Suggestion } from '../types';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onSelectTable?: (tableId: string) => void;
  onStatusChange?: (suggestionId: string, newStatus: 'pending' | 'applied' | 'dismissed') => void;
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
 * Individual suggestion card component with status tracking
 * Memoized to prevent re-renders when parent updates
 */
export const SuggestionCard = memo(function SuggestionCard({ 
  suggestion, 
  onSelectTable,
  onStatusChange
}: SuggestionCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(suggestion.status || 'pending');

  const handleClick = () => {
    if (onSelectTable && suggestion.tableId) {
      onSelectTable(suggestion.tableId);
    }
  };

  const handleStatusUpdate = async (action: 'apply' | 'dismiss' | 'reopen', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    setIsUpdating(true);
    const previousStatus = localStatus;
    
    // Optimistic update
    const newStatus = action === 'apply' ? 'applied' : action === 'dismiss' ? 'dismissed' : 'pending';
    setLocalStatus(newStatus);

    try {
      const response = await fetch(`/api/internal/suggestions/${suggestion.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const data = await response.json();
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange(suggestion.id, newStatus);
      }

      toast.success(data.message || `Suggestion ${action === 'apply' ? 'marked as applied' : action === 'dismiss' ? 'dismissed' : 'reopened'}`);
    } catch (error) {
      // Revert optimistic update on error
      setLocalStatus(previousStatus);
      toast.error('Failed to update suggestion status');
      console.error('Error updating suggestion status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const isCompleted = localStatus === 'applied' || localStatus === 'dismissed';

  return (
    <div
      onClick={handleClick}
      className={`p-3.5 rounded-xl border backdrop-blur-sm ${getSeverityStyles(suggestion.severity)} transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer group ${isCompleted ? 'opacity-60' : ''}`}
    >
      {/* Header with Status Badge */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {getSeverityIcon(suggestion.severity)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm text-gray-100 leading-snug group-hover:text-white transition-colors ${isCompleted ? 'line-through' : ''}`}>
              {suggestion.title}
            </h3>
            {localStatus === 'applied' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-950/40 border border-green-900/50 rounded text-xs text-green-400">
                <Check className="w-3 h-3" />
                Applied
              </span>
            )}
            {localStatus === 'dismissed' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-800/40 border border-gray-700/50 rounded text-xs text-gray-400">
                <X className="w-3 h-3" />
                Dismissed
              </span>
            )}
          </div>
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
      
      {/* Code References */}
      {suggestion.codeReferences && suggestion.codeReferences.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-800/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Code className="w-3 h-3 text-[#7ed321]" />
            <span className="text-xs font-bold text-[#7ed321]">Used in codebase</span>
          </div>
          <div className="space-y-1">
            {suggestion.codeReferences.slice(0, 2).map((ref, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-[#999]">
                <FileCode className="w-3 h-3 text-[#4ecdc4]" />
                <code className="flex-1 truncate font-mono text-[#ccc]">
                  {ref.filePath}
                  {ref.lineNumber && `:${ref.lineNumber}`}
                </code>
                <span className="text-[#7ed321] font-bold flex-shrink-0">
                  {ref.frequency}x
                </span>
              </div>
            ))}
            {suggestion.codeReferences.length > 2 && (
              <div className="text-xs text-[#666] italic pl-5">
                +{suggestion.codeReferences.length - 2} more locations
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impact/Action */}
      {suggestion.impact && (
        <div className="flex items-start gap-2 text-xs text-gray-400 bg-[#0f0f0f]/80 px-3 py-2 rounded-lg font-mono border border-gray-800/50 group-hover:border-gray-700/80 transition-colors mt-2.5">
          <span className="text-indigo-500 opacity-60 flex-shrink-0">$</span>
          <span className="flex-1 leading-relaxed">{suggestion.impact}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/50" onClick={(e) => e.stopPropagation()}>
        {localStatus === 'pending' || !localStatus ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => handleStatusUpdate('apply', e)}
              disabled={isUpdating}
              className="flex-1 h-7 text-xs bg-green-950/20 border-green-900/40 text-green-400 hover:bg-green-950/40 hover:text-green-300"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark as Done
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => handleStatusUpdate('dismiss', e)}
              disabled={isUpdating}
              className="flex-1 h-7 text-xs bg-gray-800/20 border-gray-700/40 text-gray-400 hover:bg-gray-800/40 hover:text-gray-300"
            >
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleStatusUpdate('reopen', e)}
            disabled={isUpdating}
            className="flex-1 h-7 text-xs bg-indigo-950/20 border-indigo-900/40 text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-300"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reopen
          </Button>
        )}
      </div>
    </div>
  );
});
