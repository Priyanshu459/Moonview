import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { auditService, AuditAction } from '../services/audit.service.js';
import { storageService } from '../services/storage.service.js';
import { mediaExposureService } from '../services/media-exposure.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../utils/logger.js';

const mediaListSelect = {
  id: true,
  originalFilename: true,
  mimeType: true,
  fileSize: true,
  processingStatus: true,
  errorMessage: true,
  contentId: true,
  episodeId: true,
  durationSeconds: true,
  width: true,
  height: true,
  createdAt: true,
  updatedAt: true,
  processingStartedAt: true,
  content: { select: { title: true, type: true } },
  episode: { select: { title: true, season: { select: { series: { select: { title: true } } } } } },
  uploadJob: { select: { processingProgress: true } },
} as const;

export class AdminMediaController {

  async listMedia(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

      const [data, total] = await Promise.all([
        prisma.mediaAsset.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: mediaListSelect,
        }),
        prisma.mediaAsset.count()
      ]);

      res.json({
        data: data.map((item: any) => {
          const { errorMessage, uploadJob, ...asset } = item;
          return {
            ...asset,
            processingError: errorMessage,
            processingProgress: uploadJob?.processingProgress ?? 0
          };
        }),
        meta: { total, page, limit, hasNext: (page * limit) < total },
      });
    } catch (error) {
      console.error('[listMedia]', error);
      res.status(500).json({ error: { message: 'Failed to list media assets' } });
    }
  }

  async getMedia(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const asset = await prisma.mediaAsset.findUnique({
        where: { id },
        select: mediaListSelect,
      });
      if (!asset) return res.status(404).json({ error: { message: 'Media Asset not found' } });
      const { errorMessage, uploadJob, ...safeAsset } = asset as any;
      res.json({
        ...safeAsset,
        processingError: errorMessage,
        processingProgress: uploadJob?.processingProgress ?? 0
      });
    } catch (error) {
      console.error('[getMedia]', error);
      res.status(500).json({ error: { message: 'Failed to get media asset' } });
    }
  }

  async deleteMedia(req: Request, res: Response) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params as { id: string };

      const asset = await prisma.mediaAsset.findUnique({
        where: { id },
        select: {
          id: true,
          contentId: true,
          episodeId: true,
          originalFilename: true,
          storageKey: true,
          hlsMasterKey: true,
          thumbnailKey: true,
        },
      });

      if (!asset) {
        return res.status(404).json({ error: { message: 'Media Asset not found' } });
      }

      // Safe delete check: verify not referenced by any Content or Episode
      if (asset.contentId || asset.episodeId) {
        return res.status(400).json({ error: { message: 'Cannot delete media asset because it is referenced by content or an episode. Remove the reference first.' } });
      }

      // Delete the asset
      await prisma.mediaAsset.delete({ where: { id } });

      const cleanupTasks: Promise<unknown>[] = [storageService.delete(asset.storageKey)];
      if (asset.hlsMasterKey) {
        cleanupTasks.push(fs.rm(path.dirname(storageService.getUri(asset.hlsMasterKey)), { recursive: true, force: true }));
        cleanupTasks.push(mediaExposureService.revokeKey(path.dirname(asset.hlsMasterKey)));
      }
      if (asset.thumbnailKey) {
        cleanupTasks.push(fs.rm(path.dirname(storageService.getUri(asset.thumbnailKey)), { recursive: true, force: true }));
      }
      const cleanupResults = await Promise.allSettled(cleanupTasks);
      if (cleanupResults.some((result) => result.status === 'rejected')) {
        logger.warn({ mediaAssetId: id }, 'Some unreferenced media files could not be removed');
      }

      await auditService.log({
        adminId,
        action: AuditAction.DELETE_MEDIA,
        resource: 'MediaAsset',
        resourceId: id,
        details: { originalFilename: asset.originalFilename }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('[deleteMedia]', error);
      res.status(500).json({ error: { message: 'Failed to delete media asset' } });
    }
  }

}

export const adminMediaController = new AdminMediaController();
