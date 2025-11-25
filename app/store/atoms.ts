import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const activeProjectIdAtom = atomWithStorage<string | undefined>(
  'slopcollector:activeProjectId',
  undefined
);

export const suggestionFiltersAtom = atom<{
  status?: 'pending' | 'applied' | 'dismissed';
  severity?: 'error' | 'warning' | 'info';
  type?: string;
  search?: string;
}>({});

export const tableFiltersAtom = atom<{
  search?: string;
  hasIndexIssues?: boolean;
}>({});

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

export const dashboardViewModeAtom = atomWithStorage<'table' | 'graph'>(
  'slopcollector:dashboardViewMode',
  'graph'
);

export const selectedSuggestionIdAtom = atom<string | undefined>(undefined);

export const selectedTableIdAtom = atom<string | undefined>(undefined);

export const isConnectionDialogOpenAtom = atom<boolean>(false);

export const selectedSuggestionIdsAtom = atom<Set<string>>(new Set<string>());

export const selectedSuggestionCountAtom = atom(
  (get) => get(selectedSuggestionIdsAtom).size
);
