/**
 * Jotai atoms for client-side UI state
 * 
 * Use these for:
 * - UI preferences (theme, layout)
 * - Filter states
 * - Modal/dialog states
 * - Selections and temporary UI state
 * 
 * For server state (API data), use React Query instead
 */

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ============================================================================
// Project Selection
// ============================================================================

/**
 * Currently active project ID
 * Persisted to localStorage so it survives page reloads
 */
export const activeProjectIdAtom = atomWithStorage<string | undefined>(
  'slopcollector:activeProjectId',
  undefined
);

// ============================================================================
// Dashboard Filters
// ============================================================================

/**
 * Filter state for suggestions dashboard
 */
export const suggestionFiltersAtom = atom<{
  status?: 'pending' | 'applied' | 'dismissed';
  severity?: 'error' | 'warning' | 'info';
  type?: string;
  search?: string;
}>({});

/**
 * Filter state for table view
 */
export const tableFiltersAtom = atom<{
  search?: string;
  hasIndexIssues?: boolean;
}>({});

// ============================================================================
// UI Preferences
// ============================================================================

/**
 * Graph layout preferences
 */
export const graphLayoutAtom = atomWithStorage<{
  direction: 'TB' | 'LR';
  nodeSpacing: number;
  rankSpacing: number;
}>(
  'slopcollector:graphLayout',
  {
    direction: 'TB',
    nodeSpacing: 100,
    rankSpacing: 100,
  }
);

/**
 * Dashboard view mode (table vs graph)
 */
export const dashboardViewModeAtom = atomWithStorage<'table' | 'graph'>(
  'slopcollector:dashboardViewMode',
  'graph'
);

// ============================================================================
// Modal/Dialog States
// ============================================================================

/**
 * Currently selected suggestion for detail view
 */
export const selectedSuggestionIdAtom = atom<string | undefined>(undefined);

/**
 * Currently selected table for detail view
 */
export const selectedTableIdAtom = atom<string | undefined>(undefined);

/**
 * Connection dialog state
 */
export const isConnectionDialogOpenAtom = atom<boolean>(false);

// ============================================================================
// Bulk Actions
// ============================================================================

/**
 * Selected suggestion IDs for bulk actions
 */
export const selectedSuggestionIdsAtom = atom<Set<string>>(new Set<string>());

/**
 * Derived atom: count of selected suggestions
 */
export const selectedSuggestionCountAtom = atom(
  (get) => get(selectedSuggestionIdsAtom).size
);
