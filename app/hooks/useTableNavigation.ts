import { useCallback } from 'react';
import type { Table } from '../types';

/**
 * Custom hook to handle table selection and navigation
 */
export function useTableNavigation(
  tables: Table[],
  selectedTable: string | null,
  setSelectedTable: (id: string | null) => void
) {
  const selectTable = useCallback((id: string | null) => {
    setSelectedTable(id);
  }, [setSelectedTable]);

  const selectNextTable = useCallback(() => {
    const currentIndex = tables.findIndex(t => t.id === selectedTable);
    const nextIndex = (currentIndex + 1) % tables.length;
    setSelectedTable(tables[nextIndex].id);
  }, [tables, selectedTable, setSelectedTable]);

  const clearSelection = useCallback(() => {
    setSelectedTable(null);
  }, [setSelectedTable]);

  return {
    selectTable,
    selectNextTable,
    clearSelection,
  };
}
