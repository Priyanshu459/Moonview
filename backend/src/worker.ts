// =============================================================================
// Moonview Backend - Worker Entry Point
// Starts only BullMQ workers and owns the worker process lifecycle.
// =============================================================================

import { connectDatabase, disconnectDatabase } from './config/database.js';
import { config } from './config/index.js';
import { closeRedisClient } from './services/redis.service.js';
import { logger } from './utils/logger.js';
import { createVideoWorker } from './queue/worker.js';
import { terminateActiveMediaProcesses } from './utils/media-process.js';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function main(): Promise<void> {
  logger.info(
    { env: config.NODE_ENV, concurrency: config.VIDEO_PROCESSING_CONCURRENCY },
    'Starting Moonview worker...',
  );

  const { storageService } = await import('./services/storage.service.js');
  const { mediaExposureService } = await import('./services/media-exposure.service.js');
  await storageService.initialize();
  await mediaExposureService.initialize();
  await connectDatabase();

  const worker = createVideoWorker();
  logger.info('Video worker is ready');

  let shutdownStarted = false;
  async function shutdown(signal: string): Promise<void> {
    if (shutdownStarted) return;
    shutdownStarted = true;
    logger.info({ signal }, 'Shutting down worker gracefully...');

    const forceTimer = setTimeout(() => {
      const terminated = terminateActiveMediaProcesses();
      logger.error({ terminated }, 'Worker shutdown deadline exceeded');
      setTimeout(() => process.exit(1), 1_000).unref();
    }, config.SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      await worker.close();
      await closeRedisClient();
      await disconnectDatabase();
      clearTimeout(forceTimer);
      logger.info('Worker shutdown complete');
      process.exit(0);
    } catch (err) {
      clearTimeout(forceTimer);
      logger.error({ err }, 'Worker shutdown failed');
      terminateActiveMediaProcesses();
      process.exit(1);
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled Promise Rejection - shutting down worker');
    shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception - shutting down worker');
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  console.error('Fatal worker startup error:', err);
  process.exit(1);
});
