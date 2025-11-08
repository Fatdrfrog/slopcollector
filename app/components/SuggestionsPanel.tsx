import { Info, TrendingUp } from 'lucide-react';
import type { Suggestion, Table } from '../types';
import { SuggestionCard } from './SuggestionCard';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  selectedTable?: Table;
}

/**
 * Panel displaying database optimization suggestions
 */
export function SuggestionsPanel({ suggestions, selectedTable }: SuggestionsPanelProps) {
  // Filter suggestions by selected table
  const filteredSuggestions = selectedTable
    ? suggestions.filter(s => s.tableId === selectedTable.id)
    : suggestions;

  // Group suggestions by severity
  const groupedSuggestions = filteredSuggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.severity]) {
      acc[suggestion.severity] = [];
    }
    acc[suggestion.severity].push(suggestion);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  const severityOrder: Suggestion['severity'][] = ['error', 'warning', 'info'];
  const sortedGroups = severityOrder.filter(severity => groupedSuggestions[severity]);

  return (
    <div className="w-[420px] border-l border-gray-800 bg-gradient-to-b from-[#1a1a1a] to-[#151515] overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 bg-[#0f0f0f]/60 backdrop-blur-sm sticky top-0 z-10">
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
      <div className="flex-1 overflow-y-auto">
        {filteredSuggestions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-4 space-y-3">
            {sortedGroups.map(severity => (
              <SuggestionGroup
                key={severity}
                severity={severity}
                suggestions={groupedSuggestions[severity]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredSuggestions.length > 0 && (
        <SummaryStats groupedSuggestions={groupedSuggestions} />
      )}
    </div>
  );
}

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

interface SuggestionGroupProps {
  severity: Suggestion['severity'];
  suggestions: Suggestion[];
}

function SuggestionGroup({ severity, suggestions }: SuggestionGroupProps) {
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
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
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
