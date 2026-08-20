// =============================================================================
// Moonview Backend — Database Client (Prisma 7 + pg adapter)
// Prisma 7 requires a driver adapter. We use @prisma/adapter-pg + pg.Pool.
// Singleton pattern ensures one Pool + one PrismaClient per process.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

let _pool: Pool | undefined;
let _prisma: PrismaClient | undefined;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: config.DATABASE_URL,
      // Pool sizing — conservative defaults for Oracle Free Tier
      max: config.NODE_ENV === 'production' ? 10 : 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected pg pool client error');
    });
  }
  return _pool;
}

/**
 * Singleton PrismaClient with pg adapter.
 * In development, reuse across hot reloads via globalThis to avoid
 * exhausting database connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

export const prisma: PrismaClient = (() => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const pool = getPool();
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      config.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'warn', emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
          ]
        : [
            { level: 'warn', emit: 'stdout' },
            { level: 'error', emit: 'stdout' },
          ],
  });

  if (config.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
    globalForPrisma.pgPool = pool;
  }

  return client;
})();

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

export async function connectDatabase(): Promise<void> {
  try {
    // Validate connectivity before serving traffic
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.fatal({ error }, '❌ Database connection failed');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  // End the pg pool — important on shutdown to release OS sockets
  if (_pool) {
    await _pool.end();
    _pool = undefined;
  }
  logger.info('Database disconnected');
}

// ---------------------------------------------------------------------------
// Health probe — returns latency in ms, throws on failure
// ---------------------------------------------------------------------------

export async function checkDatabaseHealth(): Promise<number> {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return Date.now() - start;
}
