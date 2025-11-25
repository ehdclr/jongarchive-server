export interface ApiResponse<T> {
  success: boolean;
  payload?: T;
  message?: string;
  error?: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  payload: T[];
  meta: PaginatedMeta;
}
