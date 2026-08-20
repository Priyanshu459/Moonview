import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redisClientInstance: Redis | undefined;

export function getRedisClient(): Redis {
  if (redisClientInstance) return redisClientInstance;

  redisClientInstance = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 5_000,
    connectionName: 'moonview-health',
  });

  redisClientInstance.on('error', (err: Error) => {
    logger.error(err, 'Redis client error');
  });

  redisClientInstance.on('ready', () => {
    logger.info('Redis connected');
  });

  return redisClientInstance;
}

export function createRedisConnection(connectionName = 'moonview-bullmq'): Redis {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 5_000,
    connectionName,
  });
}

export async function closeRedisClient(): Promise<void> {
  const redisClient = redisClientInstance;
  if (!redisClient) return;

  if (redisClient.status !== 'end') {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
  }

  redisClientInstance = undefined;
}
