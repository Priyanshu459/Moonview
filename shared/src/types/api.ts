// =============================================================================
// Moonview — Shared API Types
// Used by both frontend and backend for type safety across the API boundary
// =============================================================================

// ---------------------------------------------------------------------------
// Generic API Response envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Error codes — exhaustive enum used in ApiError.error.code
// ---------------------------------------------------------------------------

export const ErrorCode = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_MIME_TYPE: 'INVALID_MIME_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_EXTENSION: 'INVALID_FILE_EXTENSION',

  // Content
  CONTENT_NOT_FOUND: 'CONTENT_NOT_FOUND',
  CONTENT_ALREADY_EXISTS: 'CONTENT_ALREADY_EXISTS',
  SEASON_NOT_FOUND: 'SEASON_NOT_FOUND',
  EPISODE_NOT_FOUND: 'EPISODE_NOT_FOUND',
  GENRE_NOT_FOUND: 'GENRE_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',

  // Upload / Processing
  UPLOAD_NOT_FOUND: 'UPLOAD_NOT_FOUND',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  MEDIA_ASSET_NOT_FOUND: 'MEDIA_ASSET_NOT_FOUND',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  environment: string;
  timestamp: string;
  services: {
    database: ServiceHealth;
    storage: ServiceHealth;
    queue?: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
}
