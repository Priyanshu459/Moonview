import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Create a singleton Redis connection for the application
export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  connectTimeout: 5_000,
  connectionName: 'moonview-health',
});

redisClient.on('error', (err: Error) => {
  logger.error(err, 'Redis client error');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis connected');
});

// For BullMQ workers, it is often recommended to use a separate connection
// so they do not block each other.
export const createRedisConnection = (connectionName = 'moonview-bullmq') => {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    connectTimeout: 5_000,
    connectionName,
  });
};

export async function closeRedisClient(): Promise<void> {
  if (redisClient.status === 'end') return;
  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }
}
