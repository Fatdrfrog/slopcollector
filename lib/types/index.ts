/**
 * Shared type definitions for the SlopCollector application
 */

// Re-export common types from app/types.ts
export type { Suggestion, Table, Column, CodeReference } from '@/app/types';

// Re-export database types
export type { Database } from '@/lib/database.types';

// Re-export Supabase types
export type {
  DatabaseSchemaSnapshot,
  TableSchema,
  ColumnSchema,
  IndexSchema,
} from '@/lib/supabase/introspect';

export type {
  OptimizationSuggestion,
  SuggestionStatus,
  SuggestionSeverity,
} from '@/lib/supabase/suggestions';

/**
 * Common response types for API routes
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Common filter types
 */
export interface BaseFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SuggestionFilters extends BaseFilters {
  status?: SuggestionStatus;
  severity?: SuggestionSeverity;
  tableId?: string;
}
