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
  const filteredSuggestions = useMemo(
    () => selectedTable ? suggestions.filter(s => s.tableId === selectedTable.id) : suggestions,
    [suggestions, selectedTable]
  );

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
    <div className="h-full border-l border-border bg-background flex flex-col overflow-hidden w-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <h2 className="text-foreground flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">Optimization Insights</span>
          {selectedTable && (
            <>
              <span className="text-muted-foreground">·</span>
              <code className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
                {selectedTable.name}
              </code>
            </>
          )}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
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
    <div className="p-8 text-center text-muted-foreground">
      <div className="p-3 bg-muted/30 rounded-full w-fit mx-auto mb-3">
        <Info className="w-6 h-6 text-muted-foreground" />
      </div>
      <p>No suggestions for this selection</p>
      <p className="text-xs text-muted-foreground/80 mt-1">Everything looks good!</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 text-center">
      <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
      <p className="text-sm text-muted-foreground">Loading suggestions...</p>
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
    ? 'bg-destructive' 
    : severity === 'warning' 
      ? 'bg-yellow-500' 
      : 'bg-blue-500';

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2.5 px-1 flex items-center gap-2 font-medium">
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
    <div className="px-5 py-4 border-t border-border bg-card/60 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          count={(groupedSuggestions.error || []).length}
          label="Critical"
          variant="destructive"
        />
        <StatCard
          count={(groupedSuggestions.warning || []).length}
          label="Warnings"
          variant="warning"
        />
        <StatCard
          count={(groupedSuggestions.info || []).length}
          label="Info"
          variant="info"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  count: number;
  label: string;
  variant: 'destructive' | 'warning' | 'info';
}

function StatCard({ count, label, variant }: StatCardProps) {
  const variantStyles = {
    destructive: "bg-destructive/10 border-destructive/20 text-destructive",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  };

  return (
    <div className={`${variantStyles[variant]} border rounded-lg p-3 text-center`}>
      <div className="text-xl font-semibold mb-1">{count}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}
