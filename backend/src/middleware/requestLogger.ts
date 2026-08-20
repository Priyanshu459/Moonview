// =============================================================================
// Moonview Backend — Request Logger Middleware (pino-http)
// Logs every incoming request with method, URL, status, and response time.
// =============================================================================

import { IncomingMessage, ServerResponse } from 'http';
import { pinoHttp } from 'pino-http';
import { logger } from '../utils/logger.js';

export const requestLogger = pinoHttp({
  logger: logger as any,
  // Auto-log at different levels based on status code
  customLogLevel(req: IncomingMessage, res: ServerResponse, err?: Error) {
    if (err || (res.statusCode && res.statusCode >= 500)) return 'error';
    if (res.statusCode && res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Redact sensitive request headers from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  // Omit verbose fields from request/response logs
  serializers: {
    req(req: any) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.socket?.remoteAddress || req.remoteAddress,
      };
    },
    res(res: any) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
