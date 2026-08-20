// =============================================================================
// Moonview Backend — Application Error Classes
// Standardised error hierarchy used throughout the application.
// Every AppError maps to a specific HTTP status code and API error code.
// =============================================================================

import { ErrorCode, type ErrorCodeValue } from '@moonview/shared';

/**
 * Base class for all application errors.
 * These are operational errors that are expected and handled gracefully.
 * They are NOT programmer errors (those should be unhandled exceptions).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeValue;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCodeValue,
    details?: Record<string, string[]>,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// 400 — Bad Request
// ---------------------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, string[]>) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

// ---------------------------------------------------------------------------
// 401 — Unauthorized
// ---------------------------------------------------------------------------

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 401, ErrorCode.INVALID_CREDENTIALS);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401, ErrorCode.TOKEN_EXPIRED);
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = 'Token is invalid') {
    super(message, 401, ErrorCode.TOKEN_INVALID);
  }
}

// ---------------------------------------------------------------------------
// 403 — Forbidden
// ---------------------------------------------------------------------------

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}

// ---------------------------------------------------------------------------
// 404 — Not Found
// ---------------------------------------------------------------------------

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ErrorCode.NOT_FOUND);
  }
}

export class ContentNotFoundError extends AppError {
  constructor(id?: string) {
    super(
      id ? `Content '${id}' not found` : 'Content not found',
      404,
      ErrorCode.CONTENT_NOT_FOUND,
    );
  }
}

// ---------------------------------------------------------------------------
// 409 — Conflict
// ---------------------------------------------------------------------------

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ErrorCode.CONTENT_ALREADY_EXISTS);
  }
}

// ---------------------------------------------------------------------------
// 413 — Payload Too Large
// ---------------------------------------------------------------------------

export class FileTooLargeError extends AppError {
  constructor(maxMb: number) {
    super(`File exceeds the maximum allowed size of ${maxMb} MB`, 413, ErrorCode.FILE_TOO_LARGE);
  }
}

// ---------------------------------------------------------------------------
// 415 — Unsupported Media Type
// ---------------------------------------------------------------------------

export class InvalidMimeTypeError extends AppError {
  constructor(mimeType: string) {
    super(`File type '${mimeType}' is not supported`, 415, ErrorCode.INVALID_MIME_TYPE);
  }
}

// ---------------------------------------------------------------------------
// 429 — Rate Limited
// ---------------------------------------------------------------------------

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests — please try again later') {
    super(message, 429, ErrorCode.RATE_LIMITED);
  }
}

// ---------------------------------------------------------------------------
// 500 — Internal Server Error
// ---------------------------------------------------------------------------

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, ErrorCode.INTERNAL_ERROR);
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
