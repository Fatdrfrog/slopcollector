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

export type SuggestionStatus = 'pending' | 'applied' | 'dismissed' | 'archived';

export type SuggestionSeverity = 'critical' | 'error' | 'warning' | 'info';

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


