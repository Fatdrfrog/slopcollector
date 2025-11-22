import { memo, useMemo } from 'react';
import { Info, TrendingUp, Loader2 } from 'lucide-react';
import type { Suggestion, Table } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  selectedTable?: Table;
  onSelectTable?: (tableId: string) => void;
  isLoading?: boolean;
  onStatusChange?: (suggestionId: string, newStatus: 'pending' | 'applied' | 'dismissed') => void;
}

/**
 * Panel displaying database optimization suggestions
 * Optimized with React.memo and useMemo to prevent unnecessary re-renders
 */
export const SuggestionsPanel = memo(function SuggestionsPanel({ 
  suggestions, 
  selectedTable, 
  onSelectTable,
  isLoading = false,
  onStatusChange,
}: SuggestionsPanelProps) {
  // Memoize filtered suggestions to prevent recalculation on every render
  const filteredSuggestions = useMemo(
    () => selectedTable ? suggestions.filter(s => s.tableId === selectedTable.id) : suggestions,
    [suggestions, selectedTable]
  );

  // Memoize grouped suggestions
  const groupedSuggestions = useMemo(() => {
    return filteredSuggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.severity]) {
        acc[suggestion.severity] = [];
      }
      acc[suggestion.severity].push(suggestion);
      return acc;
    }, {} as Record<string, Suggestion[]>);
  }, [filteredSuggestions]);

  const severityOrder: Suggestion['severity'][] = ['error', 'warning', 'info'];
  const sortedGroups = useMemo(
    () => severityOrder.filter(severity => groupedSuggestions[severity]),
    [groupedSuggestions]
  );

  return (
    <div className="h-full border-l border-gray-800 bg-linear-to-b from-[#1a1a1a] to-[#151515] flex flex-col overflow-hidden w-full min-w-[320px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 bg-[#0f0f0f]/60 backdrop-blur-sm shrink-0">
        <h2 className="text-gray-100 flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-950/30 rounded-lg">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <span>Optimization Insights</span>
          {selectedTable && (
            <>
              <span className="text-gray-700">·</span>
              <code className="text-sm text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded font-mono">
                {selectedTable.name}
              </code>
            </>
          )}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          {filteredSuggestions.length} optimization{filteredSuggestions.length !== 1 ? 's' : ''} detected
        </p>
      </div>

      {/* Suggestions List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <LoadingState />
        ) : filteredSuggestions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-4 space-y-3 pr-3">
            {sortedGroups.map(severity => (
              <SuggestionGroup
                key={severity}
                severity={severity}
                suggestions={groupedSuggestions[severity]}
                onSelectTable={onSelectTable}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary Stats */}
      {filteredSuggestions.length > 0 && (
        <div className="shrink-0">
          <SummaryStats groupedSuggestions={groupedSuggestions} />
        </div>
      )}
    </div>
  );
});

function EmptyState() {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="p-3 bg-gray-800/30 rounded-full w-fit mx-auto mb-3">
        <Info className="w-6 h-6 text-gray-600" />
      </div>
      <p>No suggestions for this selection</p>
      <p className="text-xs text-gray-600 mt-1">Everything looks good!</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 text-center">
      <Loader2 className="w-8 h-8 text-[#7ed321] mx-auto mb-3 animate-spin" />
      <p className="text-sm text-[#999]">Loading suggestions...</p>
    </div>
  );
}

interface SuggestionGroupProps {
  severity: Suggestion['severity'];
  suggestions: Suggestion[];
  onSelectTable?: (tableId: string) => void;
  onStatusChange?: (suggestionId: string, newStatus: 'pending' | 'applied' | 'dismissed') => void;
}

function SuggestionGroup({ severity, suggestions, onSelectTable, onStatusChange }: SuggestionGroupProps) {
  const dotColor = severity === 'error' 
    ? 'bg-red-500' 
    : severity === 'warning' 
      ? 'bg-amber-500' 
      : 'bg-blue-500';

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-600 mb-2.5 px-1 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {severity} ({suggestions.length})
      </div>
      <div className="space-y-2.5">
        {suggestions.map((suggestion) => (
          <SuggestionCard 
            key={suggestion.id} 
            suggestion={suggestion}
            onSelectTable={onSelectTable}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

interface SummaryStatsProps {
  groupedSuggestions: Record<string, Suggestion[]>;
}

function SummaryStats({ groupedSuggestions }: SummaryStatsProps) {
  return (
    <div className="px-5 py-4 border-t border-gray-800 bg-[#0f0f0f]/60 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          count={(groupedSuggestions.error || []).length}
          label="Critical"
          color="red"
        />
        <StatCard
          count={(groupedSuggestions.warning || []).length}
          label="Warnings"
          color="amber"
        />
        <StatCard
          count={(groupedSuggestions.info || []).length}
          label="Info"
          color="blue"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  count: number;
  label: string;
  color: 'red' | 'amber' | 'blue';
}

function StatCard({ count, label, color }: StatCardProps) {
  const bgColor = `bg-${color}-950/20`;
  const borderColor = `border-${color}-900/30`;
  const textColor = `text-${color}-400`;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-3 text-center`}>
      <div className={`text-xl ${textColor} mb-1`}>{count}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
