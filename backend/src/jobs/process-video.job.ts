import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { storageService } from '../services/storage.service.js';
import { runFFprobe } from '../utils/ffprobe.js';
import { generateHlsVariants, generateThumbnail, getTargetResolutions } from '../utils/ffmpeg.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../utils/logger.js';
import { MediaProcessError } from '../utils/media-process.js';

export function safeProcessingFailure(error: unknown): string {
  const details = error instanceof MediaProcessError
    ? `${error.message} ${error.stderr}`
    : error instanceof Error ? error.message : String(error);
  const normalized = details.toLowerCase();

  if (normalized.includes('enospc') || normalized.includes('no space left')) {
    return 'Media processing failed because storage is full';
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

    // 3. Setup workspace
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), `moonview-process-${jobId}-`));
    const sourceUri = storageService.getUri(initialCheck.mediaAsset.storageKey);

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
    await generateHlsVariants(sourceUri, workspaceDir, targetResolutions, Boolean(probeData.audioCodec));
    
    // 6. Generate Thumbnail
    await job.updateProgress(80);
    const thumbnailName = `poster.jpg`;
    const thumbnailWorkspacePath = path.join(workspaceDir, thumbnailName);
    
    await generateThumbnail(sourceUri, thumbnailWorkspacePath, Math.min(2, probeData.duration / 2));

    // 7. Verification: Ensure files exist before transitioning
    await fs.access(path.join(workspaceDir, 'master.m3u8'));
    await fs.access(thumbnailWorkspacePath);

    // 8. Finalize Storage
    await job.updateProgress(90);
    const assetHlsPrefix = `hls/${mediaAssetId}`;
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
    // Then move the rest of HLS to hls/
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
      await tx.videoVariant.createMany({
        data: targetResolutions.map((res, index) => ({
          mediaAssetId,
          resolution: resEnumMap[res.name],
          manifestKey: `${assetHlsPrefix}/stream_v${index}.m3u8`,
          width: res.width,
          height: res.height,
          bitrate: res.bitrate,
        })),
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
    const willRetry = job.attemptsMade + 1 < maxAttempts;

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

    throw error; // Let BullMQ retry mechanism handle it
  } finally {
    // Cleanup workspace
    if (workspaceDir) {
      await fs.rm(workspaceDir, { recursive: true, force: true }).catch(err => {
        logger.error({ jobId, err }, 'Failed to cleanup temporary workspace');
      });
    }
  }
};
