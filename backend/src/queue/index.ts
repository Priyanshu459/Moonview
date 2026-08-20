import { Queue } from 'bullmq';
import { createRedisConnection } from '../services/redis.service.js';

export const videoQueue = new Queue('video-processing', {
  connection: createRedisConnection('moonview-video-queue'),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 24 * 60 * 60, count: 100 },
    removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 },
  },
});

export async function closeVideoQueue(): Promise<void> {
  await videoQueue.close();
}
