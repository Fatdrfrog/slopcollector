'use client';

import { motion } from 'motion/react';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/app/components/ui/resizable';

import { EmptyState } from '@/app/components/EmptyState';
import { ERDCanvas } from '@/app/components/ERDCanvas';
import { NoSuggestionsPrompt } from '@/app/components/NoSuggestionsPrompt';
import { SuggestionsPanel } from '@/app/components/SuggestionsPanel';
import type { Table, Suggestion } from '@/lib/types';

interface DashboardContentProps {
  tables: Table[];
  suggestions: Suggestion[];
  selectedTable: string | null;
  selectedTableData: Table | undefined;
  showSuggestions: boolean;
  loading: boolean;
  hasGeneratedBefore: boolean;
  isGeneratingAdvice: boolean;
  onTableSelect: (tableId: string | null) => void;
  onSync: () => void;
  onGenerateAdvice: () => void;
}

export function DashboardContent({
  tables,
  suggestions,
  selectedTable,
  selectedTableData,
  showSuggestions,
  loading,
  hasGeneratedBefore,
  isGeneratingAdvice,
  onTableSelect,
  onSync,
  onGenerateAdvice,
}: DashboardContentProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1 flex">
      {tables.length === 0 ? (
        <EmptyState onSync={onSync} isSyncing={loading} />
      ) : (
        <>
          <ResizablePanel defaultSize={75}>
            <ERDCanvas
              tables={tables}
              selectedTable={selectedTable}
              onTableSelect={onTableSelect}
              suggestions={suggestions}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />

          {showSuggestions && (
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <motion.div
                initial={{ x: 420, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 420, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="h-full"
              >
                {suggestions.length === 0 && !loading ? (
                  <NoSuggestionsPrompt
                    onGenerateAdvice={onGenerateAdvice}
                    isGenerating={isGeneratingAdvice}
                    hasGeneratedBefore={hasGeneratedBefore}
                  />
                ) : (
                  <SuggestionsPanel
                    suggestions={suggestions}
                    selectedTable={selectedTableData}
                    onSelectTable={onTableSelect}
                    isLoading={loading}
                  />
                )}
              </motion.div>
            </ResizablePanel>
          )}
        </>
      )}
    </ResizablePanelGroup>
  );
}

