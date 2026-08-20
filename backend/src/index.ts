// =============================================================================
// Moonview Backend — Server Entry Point
// Starts the HTTP server and manages the application lifecycle.
// =============================================================================

import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

// Ensure BigInts are correctly serialized to strings instead of crashing
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function main(): Promise<void> {
  logger.info(
    { env: config.NODE_ENV, host: config.HOST, port: config.PORT },
    '🚀 Starting Moonview API server...',
  );

  // Initialize storage directories before accepting any traffic
  const { storageService } = await import('./services/storage.service.js');
  const { mediaExposureService } = await import('./services/media-exposure.service.js');
  await storageService.initialize();
  await mediaExposureService.initialize();
  logger.info('✅ Storage initialized');

  // Connect to the database before accepting any traffic
  await connectDatabase();

  // Import routes only after storage and PostgreSQL are ready.
  const { createApp } = await import('./app.js');
  const app = createApp();

  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info(`✅ Server listening on http://${config.HOST}:${config.PORT}`);
    logger.info(`📋 Health check: http://${config.HOST}:${config.PORT}/api/health`);
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  // ---------------------------------------------------------------------------
  // Graceful shutdown
  // On SIGINT or SIGTERM: stop accepting new connections, drain existing ones,
  // then close the database connection and exit cleanly.
  // ---------------------------------------------------------------------------
  let shutdownStarted = false;
  async function shutdown(signal: string): Promise<void> {
    if (shutdownStarted) return;
    shutdownStarted = true;
    logger.info({ signal }, 'Shutting down gracefully...');

    const httpClosed = new Promise<void>((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
    });

    const forceTimer = setTimeout(async () => {
      const { terminateActiveMediaProcesses } = await import('./utils/media-process.js');
      const terminated = terminateActiveMediaProcesses();
      logger.error({ terminated }, 'Graceful shutdown deadline exceeded');
      server.closeAllConnections();
      setTimeout(() => process.exit(1), 1_000).unref();
    }, config.SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      const { closeVideoQueue } = await import('./queue/index.js');
      await closeVideoQueue();
      const { closeRedisClient } = await import('./services/redis.service.js');
      await closeRedisClient();
      await httpClosed;
      await disconnectDatabase();
      clearTimeout(forceTimer);
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      clearTimeout(forceTimer);
      logger.error({ err }, 'Error during graceful shutdown');
      const { terminateActiveMediaProcesses } = await import('./utils/media-process.js');
      terminateActiveMediaProcesses();
      process.exit(1);
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Log unhandled promise rejections — do NOT swallow them silently
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled Promise Rejection — shutting down');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception — shutting down');
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  // Config errors or DB connection failures during startup
  console.error('Fatal startup error:', err);
  process.exit(1);
});
