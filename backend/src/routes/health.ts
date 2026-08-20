// =============================================================================
// Moonview Backend — Health Check Route
// GET /api/health
// Returns the status of the application and its dependencies.
// =============================================================================

import { Router } from 'express';
import { checkDatabaseHealth } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { HealthStatus, ServiceHealth } from '@moonview/shared';
import { getRedisClient } from '../services/redis.service.js';
import { storageService } from '../services/storage.service.js';
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

const router = Router();

// GET /api/health
router.get('/live', (_req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
});

async function readiness(_req: unknown, res: any) {
  const [dbHealth, redisHealth, storageHealth] = await Promise.all([
    checkDb(),
    checkRedis(),
    checkStorage(),
  ]);

  const overallStatus: HealthStatus['status'] =
    [dbHealth, redisHealth, storageHealth].some((service) => service.status === 'down') ? 'degraded' : 'ok';

  const health: HealthStatus = {
    status: overallStatus,
    version: '0.1.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      storage: storageHealth,
      queue: redisHealth,
    },
  };

  const statusCode = overallStatus === 'ok' ? 200 : 503;
  sendSuccess(res, health, statusCode);
}

router.get('/', readiness);
router.get('/ready', readiness);

async function withinDeadline<T>(operation: Promise<T>): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Health check timed out')), config.HEALTH_CHECK_TIMEOUT_MS);
        timeout.unref();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function checkDb(): Promise<ServiceHealth> {
  try {
    const latencyMs = await withinDeadline(checkDatabaseHealth());
    return { status: 'ok', latencyMs };
  } catch (error) {
    logger.warn({ error }, 'Database health check failed');
    return { status: 'down', message: 'Database unreachable' };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await withinDeadline(getRedisClient().ping());
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    logger.warn({ error }, 'Redis health check failed');
    return { status: 'down', message: 'Queue dependency unreachable' };
  }
}

async function checkStorage(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await withinDeadline(fs.access(storageService.getUri(''), fsConstants.R_OK | fsConstants.W_OK));
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    logger.warn({ error }, 'Storage health check failed');
    return { status: 'down', message: 'Storage unavailable' };
  }
}

export { router as healthRouter };
