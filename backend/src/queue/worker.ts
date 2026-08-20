import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../services/redis.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { processVideoJob } from '../jobs/process-video.job.js';
import { safeProcessingFailure } from '../jobs/process-video.job.js';
import { prisma } from '../config/database.js';

export const videoWorker = new Worker(
  'video-processing',
  async (job: Job) => {
    if (job.name === 'process-video') {
      await processVideoJob(job);
    }
  },
  {
    connection: createRedisConnection('moonview-video-worker'),
    concurrency: config.VIDEO_PROCESSING_CONCURRENCY,
    lockDuration: 120_000,
    stalledInterval: 30_000,
    maxStalledCount: 1,
  }
);

videoWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Video processing job completed successfully');
});

videoWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Video processing job failed');
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;

  const { jobId, mediaAssetId } = job.data as { jobId?: string; mediaAssetId?: string };
  if (!jobId || !mediaAssetId) return;
  const failure = safeProcessingFailure(err);
  try {
    await prisma.$transaction([
      prisma.uploadJob.update({ where: { id: jobId }, data: { status: 'FAILED', errorMessage: failure } }),
      prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: { processingStatus: 'FAILED', errorMessage: failure, processingCompletedAt: new Date() },
      }),
    ]);
  } catch (dbError) {
    logger.error({ jobId, err: dbError }, 'Could not persist terminal worker failure');
  }
});

videoWorker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'Video processing job stalled and will be recovered by BullMQ');
});

videoWorker.on('error', (err) => {
  logger.error({ err }, 'Video processing worker error');
});

export async function closeVideoWorker(): Promise<void> {
  await videoWorker.close();
}
