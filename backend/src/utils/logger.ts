// =============================================================================
// Moonview Backend — Structured Logger (Pino)
// =============================================================================

import pino from 'pino';
import { config } from '../config/index.js';

const transport =
  config.LOG_PRETTY
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      })
    : undefined;

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    base: {
      env: config.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Redact sensitive fields from logs
    redact: {
      paths: [
        'password',
        'passwordHash',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'jwt',
        'csrfToken',
        'DATABASE_URL',
        'COOKIE_SECRET',
        'JWT_SECRET',
        '*.password',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
  },
  transport,
);

export type Logger = typeof logger;
