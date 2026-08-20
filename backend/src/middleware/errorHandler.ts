// =============================================================================
// Moonview Backend — Global Error Handler Middleware
// Must be registered as the LAST middleware in Express.
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { ErrorCode } from '@moonview/shared';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express requires 4 arguments for error middleware — _next must be present
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // -------------------------------------------------------------------------
  // Zod validation errors — convert to our standard ValidationError format
  // -------------------------------------------------------------------------
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      details[key] ??= [];
      details[key].push(issue.message);
    }

    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Operational errors — known, expected errors with a specific status code
  // -------------------------------------------------------------------------
  if (isAppError(err)) {
    if (err.statusCode >= 500) {
      logger.error({ err, req: { method: req.method, url: req.url } }, err.message);
    } else {
      logger.warn({ code: err.code, url: req.url }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Express built-in errors (e.g. body-parser payload too large)
  // -------------------------------------------------------------------------
  if (typeof err === 'object' && err !== null && 'status' in err && 'message' in err) {
    const httpErr = err as { status: number; message: string };
    res.status(httpErr.status).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: httpErr.message,
      },
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Unknown / programmer errors — log the full stack, hide details from client
  // -------------------------------------------------------------------------
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message:
        config.NODE_ENV === 'development'
          ? String(err instanceof Error ? err.message : err)
          : 'An unexpected error occurred',
    },
  });
}
