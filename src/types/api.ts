// src/types/api.ts

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function apiSuccess<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { data, ...(meta ? { meta } : {}) };
}

export function apiError(error: string): ApiResponse<never> {
  return { error };
}
