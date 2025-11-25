'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Database, X } from 'lucide-react';
import type { Table } from '@/lib/types';

interface CommandPaletteProps {
  tables: Table[];
  onClose: () => void;
  onSelectTable: (id: string) => void;
}

export function CommandPalette({ tables, onClose, onSelectTable }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(query.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredTables.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredTables[selectedIndex]) {
      e.preventDefault();
      onSelectTable(filteredTables[selectedIndex].id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-32 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] rounded-lg shadow-2xl border border-gray-800 w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tables and columns..."
            className="flex-1 outline-none text-gray-100 placeholder-gray-500 bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredTables.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No tables found matching "{query}"
            </div>
          ) : (
            <div className="py-2">
              {filteredTables.map((table, index) => {
                const matchingColumns = table.columns.filter(col =>
                  col.name.toLowerCase().includes(query.toLowerCase())
                );

                return (
                  <button
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-900/50 transition-colors ${
                      index === selectedIndex ? 'bg-indigo-950/30' : ''
                    }`}
                  >
                    <Database className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-100">{table.name}</span>
                        <span className="text-xs text-gray-500">
                          {table.columns.length} columns
                        </span>
                        {table.rowCount && (
                          <span className="text-xs text-gray-600">
                            · {table.rowCount.toLocaleString()} rows
                          </span>
                        )}
                      </div>
                      {matchingColumns.length > 0 && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-600">Matching columns:</span>
                          {matchingColumns.slice(0, 3).map(col => (
                            <code
                              key={col.name}
                              className="text-xs bg-[#0f0f0f] px-1.5 py-0.5 rounded text-gray-400"
                            >
                              {col.name}
                            </code>
                          ))}
                          {matchingColumns.length > 3 && (
                            <span className="text-xs text-gray-600">
                              +{matchingColumns.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 border-t border-gray-800 bg-[#0f0f0f] flex items-center gap-4 text-xs text-gray-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded border border-gray-800">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded border border-gray-800">Enter</kbd> Select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded border border-gray-800">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}