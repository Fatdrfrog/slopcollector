export type {
  Position,
  Column,
  Table,
  CodeReference,
  Suggestion,
  SuggestionSeverity,
} from './domain';

export type {
  ApiResponse,
  PaginatedResponse,
  BaseFilters,
  SuggestionFilters,
  SuggestionStatus,
} from './api';

export type {
  ColumnSchema,
  TableSchema,
  IndexSchema,
  DatabaseSchemaSnapshot,
  OptimizationSuggestion,
} from './database';

export type { Database } from '@/lib/database.types';
