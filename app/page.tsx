'use client';

import { useState } from 'react';
import { Landing } from './components/Landing';
import { Header } from './components/Header';
import { ERDCanvas } from './components/ERDCanvas';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { CommandPalette } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTableNavigation } from './hooks/useTableNavigation';
import { mockTables, mockSuggestions } from './data/mockData';

/**
 * Main application component for the ERD Panel
 */
export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [tables] = useState(mockTables);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Table navigation handlers
  const { selectTable, selectNextTable, clearSelection } = useTableNavigation(
    tables,
    selectedTable,
    setSelectedTable
  );

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      onCommandK: () => setShowCommandPalette(true),
      onEscape: () => {
        setShowCommandPalette(false);
        clearSelection();
      },
      onTab: selectNextTable,
    },
    [selectNextTable, clearSelection]
  );

  const selectedTableData = tables.find(t => t.id === selectedTable);

  // Show landing page if not connected
  if (!isConnected) {
    return <Landing onConnect={() => setIsConnected(true)} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <Header
        tableCount={tables.length}
        showSuggestions={showSuggestions}
        onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ERDCanvas
            tables={tables}
            selectedTable={selectedTable}
            onTableSelect={selectTable}
          />
        </div>

        {/* Suggestions Panel */}
        {showSuggestions && (
          <SuggestionsPanel
            suggestions={mockSuggestions}
            selectedTable={selectedTableData}
          />
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          tables={tables}
          onClose={() => setShowCommandPalette(false)}
          onSelectTable={(id) => {
            selectTable(id);
            setShowCommandPalette(false);
          }}
        />
      )}
    </div>
  );
}