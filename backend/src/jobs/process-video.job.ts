import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { storageService } from '../services/storage.service.js';
import { runFFprobe } from '../utils/ffprobe.js';
import { generateHlsVariants, generateThumbnail, getTargetResolutions } from '../utils/ffmpeg.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../utils/logger.js';
import { MediaProcessError } from '../utils/media-process.js';
import { config } from '../config/index.js';

export class NonRetryableProcessingError extends Error {
  public readonly nonRetryable = true;
}

export async function ensureProcessingDiskCapacity(sourcePath: string, workspaceRoot: string): Promise<void> {
  await fs.mkdir(workspaceRoot, { recursive: true });
  const [sourceStats, diskStats] = await Promise.all([
    fs.stat(sourcePath),
    fs.statfs(workspaceRoot),
  ]);

  const requiredBytes = Number(sourceStats.size) * 3;
  const availableBytes = Number(diskStats.bavail) * Number(diskStats.bsize);

  if (availableBytes < requiredBytes) {
    throw new NonRetryableProcessingError('Insufficient processing disk capacity');
  }
}

export function safeProcessingFailure(error: unknown): string {
  const details = error instanceof MediaProcessError
    ? `${error.message} ${error.stderr}`
    : error instanceof Error ? error.message : String(error);
  const normalized = details.toLowerCase();

  if (normalized.includes('enospc') || normalized.includes('no space left')) {
    return 'Media processing failed because storage is full';
  }
  if (normalized.includes('insufficient processing disk capacity')) {
    return 'Media processing failed because storage capacity is insufficient';
  }
  if (normalized.includes('no such file') || normalized.includes('enoent')) {
    return 'Source media is missing or unavailable';
  }
  if (normalized.includes('timed out')) {
    return 'Media processing timed out';
  }
  if (normalized.includes('no video stream')) {
    return 'Media validation failed: no video stream was found';
  }
  return 'Video processing failed';
}

export const processVideoJob = async (job: Job) => {
  const { jobId, mediaAssetId } = job.data;
  let workspaceDir: string | null = null;

  try {
    // 1. Validate Job and MediaAsset exist
    const initialCheck = await prisma.uploadJob.findUnique({
      where: { id: jobId },
      include: { mediaAsset: true },
    });

    if (!initialCheck || !initialCheck.mediaAsset) {
      throw new Error(`UploadJob or MediaAsset not found for id: ${jobId}`);
    }

    if (initialCheck.status === 'READY') {
      logger.info({ jobId }, 'Job already processed');
      return;
    }

    // 2. Transition to PROCESSING (Short transaction)
    await prisma.$transaction([
      prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING', processingProgress: 5 },
      }),
      prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: { processingStatus: 'PROCESSING', processingStartedAt: new Date() },
      })
    ]);

    // 3. Setup workspace on configured persistent processing storage.
    const sourceUri = storageService.getUri(initialCheck.mediaAsset.storageKey);
    await ensureProcessingDiskCapacity(sourceUri, config.PROCESSING_TMP_ROOT);
    workspaceDir = await fs.mkdtemp(path.join(config.PROCESSING_TMP_ROOT, `moonview-process-${jobId}-`));

    // 4. Run FFprobe
    await job.updateProgress(10);
    logger.info({ jobId, mediaAssetId }, 'Running FFprobe');
    const probeData = await runFFprobe(sourceUri);

    // Update MediaAsset with probed metadata
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        width: probeData.width,
        height: probeData.height,
        durationSeconds: probeData.duration,
        codec: probeData.videoCodec,
        bitrate: probeData.bitrate,
      }
    });

    if (probeData.width < 360) {
      throw new Error(`Video resolution too low: ${probeData.width}x${probeData.height}`);
    }

    // 5. Generate HLS Variants
    await job.updateProgress(20);
    const targetResolutions = getTargetResolutions(probeData.width, probeData.height);
    logger.info({ jobId, targetResolutions: targetResolutions.map(r => r.name) }, 'Target resolutions determined');

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { status: 'GENERATING_HLS', processingProgress: 20 },
    });

    let lastProgressUpdate = Date.now();
    await generateHlsVariants(sourceUri, workspaceDir, targetResolutions, Boolean(probeData.audioCodec), jobId, mediaAssetId, async (timeSec) => {
      const now = Date.now();
      if (now - lastProgressUpdate > 2000) { // Throttle Redis updates to max once per 2 seconds
        lastProgressUpdate = now;
        const percentage = Math.min(100, Math.floor((timeSec / probeData.duration) * 60)); // Max 60% assigned to HLS generation (20 to 80)
        const currentProgress = 20 + percentage;

        await job.updateProgress(currentProgress).catch(err => {
          logger.warn({ jobId, err }, 'Failed to update job progress in Redis');
        });

        // Also update the database so the frontend can read it via the API
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { processingProgress: currentProgress }
        }).catch(() => {});
      }
    });

    // 6. Generate Thumbnail
    await job.updateProgress(80);
    await prisma.uploadJob.update({ where: { id: jobId }, data: { processingProgress: 80 } }).catch(() => {});
    const thumbnailName = `poster.jpg`;
    const thumbnailWorkspacePath = path.join(workspaceDir, thumbnailName);

    await generateThumbnail(sourceUri, thumbnailWorkspacePath, Math.min(2, probeData.duration / 2), jobId, mediaAssetId);

    // 7. Verification: Ensure files exist before transitioning
    await fs.access(path.join(workspaceDir, 'master.m3u8'));
    await fs.access(thumbnailWorkspacePath);

    // 8. Finalize Storage
    await job.updateProgress(90);
    await prisma.uploadJob.update({ where: { id: jobId }, data: { processingProgress: 90 } }).catch(() => {});
    const assetHlsPrefix = `hls-private/${mediaAssetId}`;
    const assetPosterPrefix = `posters/${mediaAssetId}`;

    // A prior attempt may have moved output before its database transaction
    // failed. The asset is not READY yet, so replacing only its derived output
    // makes retries deterministic without touching the original upload.
    await Promise.all([
      fs.rm(storageService.getUri(assetHlsPrefix), { recursive: true, force: true }),
      fs.rm(storageService.getUri(assetPosterPrefix), { recursive: true, force: true }),
    ]);

    // Create new directories using importDirectory (which moves from workspace)
    // First, move thumbnail out since it goes to posters/
    await storageService.importDirectory(path.join(workspaceDir, thumbnailName), `${assetPosterPrefix}/poster.jpg`);
    // Then move the rest of HLS to private storage. Publish exposes a copy.
    await storageService.importDirectory(workspaceDir, assetHlsPrefix);

    // 9. Update Database to READY (Short transaction)
    await job.updateProgress(100);

    await prisma.$transaction(async (tx: any) => {
      const resEnumMap: Record<string, any> = {
          '1080p': 'RES_1080P',
          '720p': 'RES_720P',
          '480p': 'RES_480P',
          '360p': 'RES_360P'
      };

      await tx.videoVariant.deleteMany({ where: { mediaAssetId } });
      const variants = targetResolutions.map((res, index) => ({
        mediaAssetId,
        resolution: resEnumMap[res.name],
        manifestKey: `${assetHlsPrefix}/stream_${index}.m3u8`,
        width: res.width,
        height: res.height,
        bitrate: res.bitrate,
      }));

      await Promise.all(variants.map((variant) => fs.access(storageService.getUri(variant.manifestKey))));

      await tx.videoVariant.createMany({
        data: variants,
      });

      await tx.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          processingStatus: 'READY',
          hlsMasterKey: `${assetHlsPrefix}/master.m3u8`,
          thumbnailKey: `${assetPosterPrefix}/poster.jpg`,
          processingCompletedAt: new Date(),
          errorMessage: null,
        }
      });

      await tx.uploadJob.update({
        where: { id: jobId },
        data: {
          status: 'READY',
          processingProgress: 100,
          errorMessage: null,
        }
      });
    });

    logger.info({ jobId }, 'Video processing completed successfully');

  } catch (error: any) {
    logger.error({ jobId, err: error }, 'Video processing failed');

    const safeFailure = safeProcessingFailure(error);
    const maxAttempts = job.opts.attempts ?? 1;
    const nonRetryable = error instanceof NonRetryableProcessingError || Boolean(error?.nonRetryable);
    const willRetry = !nonRetryable && job.attemptsMade + 1 < maxAttempts;

    // Clean up DB safely. Retryable attempts return to PENDING; only the final
    // failure becomes terminal.
    try {
      await prisma.$transaction([
        prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: willRetry ? 'PENDING' : 'FAILED', errorMessage: safeFailure },
        }),
        prisma.mediaAsset.update({
          where: { id: mediaAssetId },
          data: {
            processingStatus: willRetry ? 'PENDING' : 'FAILED',
            errorMessage: safeFailure,
            processingCompletedAt: willRetry ? null : new Date(),
          },
        })
      ]);
    } catch (dbError) {
      logger.error({ jobId, err: dbError }, 'Failed to record error state to DB');
    }

    if (nonRetryable) return;
    throw error; // Let BullMQ retry mechanism handle retryable failures
  } finally {
    // Cleanup workspace
    if (workspaceDir) {
      await fs.rm(workspaceDir, { recursive: true, force: true }).catch(err => {
        logger.error({ jobId, err }, 'Failed to cleanup temporary workspace');
      });
    }
  }
};
