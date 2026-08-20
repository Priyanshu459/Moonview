// =============================================================================
// Moonview Backend — Configuration System
// Reads and validates all required environment variables at startup.
// Fails fast with a clear error if any required variable is missing.
// =============================================================================

import { z } from 'zod';

const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters — use a cryptographically random value'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),
  COOKIE_SECURE: z.string().default('false').transform((v) => {
    if (process.env.NODE_ENV === 'production' && v !== 'true') {
      throw new Error('COOKIE_SECURE must be true in production');
    }
    return v === 'true';
  }),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Initial admin (seed only — optional after first seed)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_NAME: z.string().optional(),

  // Storage
  STORAGE_ROOT: z.string().default('./media'),
  STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10240),
  STORAGE_MAX_IMAGE_SIZE_MB: z.coerce.number().int().positive().default(20),

  // Redis
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // FFmpeg
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  FFMPEG_THREADS: z.coerce.number().int().min(1).max(4).default(1),
  MEDIA_PROCESS_TIMEOUT_MS: z.coerce.number().int().min(60_000).default(6 * 60 * 60 * 1000),

  // Processing
  VIDEO_PROCESSING_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(120_000).default(30_000),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().int().min(100).max(10_000).default(2_000),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  LOG_PRETTY: z.string().default('false').transform((v) => v === 'true'),
}).superRefine((values, ctx) => {
  if (values.NODE_ENV !== 'production') return;

  const productionRequired = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'COOKIE_SECRET',
    'CORS_ORIGINS',
    'STORAGE_ROOT',
    'FFMPEG_PATH',
    'FFPROBE_PATH',
  ] as const;

  for (const name of productionRequired) {
    if (!process.env[name]?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: [name],
        message: `${name} must be explicitly configured in production`,
      });
    }
  }

  if (values.CORS_ORIGINS.includes('*')) {
    ctx.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'Wildcard CORS origins are not allowed in production',
    });
  }
});

function loadConfig() {
  const parsed = configSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  [${i.path.join('.')}] ${i.message}`)
      .join('\n');
    throw new Error(
      `\n\n❌ Environment configuration error:\n${issues}\n\n` +
        `Copy backend/.env.example to backend/.env and fill in the required values.\n`,
    );
  }

  return parsed.data;
}

export const config = loadConfig();

export type Config = typeof config;
