// =============================================================================
// Moonview Backend — 404 Not Found Handler
// Catches all unmatched routes and returns a clean JSON 404.
// =============================================================================

import type { Request, Response } from 'express';
import { ErrorCode } from '@moonview/shared';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
