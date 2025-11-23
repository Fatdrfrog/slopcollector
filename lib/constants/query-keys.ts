/**
 * Query key factory pattern for React Query
 * 
 * This ensures consistent query keys across the app and makes it easier
 * to invalidate related queries.
 * 
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

export const queryKeys = {
  // Project queries
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: object) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  // Dashboard queries
  dashboard: {
    all: (projectId: string) => ['dashboard', projectId] as const,
    tables: (projectId: string) => [...queryKeys.dashboard.all(projectId), 'tables'] as const,
    suggestions: (projectId: string) => [...queryKeys.dashboard.all(projectId), 'suggestions'] as const,
    codePatterns: (projectId: string) => [...queryKeys.dashboard.all(projectId), 'codePatterns'] as const,
  },

  // Schema queries
  schema: {
    all: (projectId: string) => ['schema', projectId] as const,
    snapshot: (projectId: string) => [...queryKeys.schema.all(projectId), 'snapshot'] as const,
    snapshots: (projectId: string) => [...queryKeys.schema.all(projectId), 'snapshots'] as const,
  },

  // Suggestion queries
  suggestions: {
    all: (projectId: string) => ['suggestions', projectId] as const,
    lists: (projectId: string) => [...queryKeys.suggestions.all(projectId), 'list'] as const,
    list: (projectId: string, filters?: { status?: string }) => 
      [...queryKeys.suggestions.lists(projectId), filters] as const,
    stats: (projectId: string) => [...queryKeys.suggestions.all(projectId), 'stats'] as const,
    detail: (suggestionId: string) => ['suggestions', 'detail', suggestionId] as const,
  },
} as const;
