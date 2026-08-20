import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { z } from 'zod';
import { auditService, AuditAction } from '../services/audit.service.js';

export class AdminController {
  
  async getStats(req: Request, res: Response) {
    try {
      const [
        totalMovies,
        totalSeries,
        totalEpisodes,
        publishedCount,
        processingCount,
        failedCount,
        recentUploads,
        recentActions
      ] = await Promise.all([
        prisma.content.count({ where: { type: 'MOVIE' } }),
        prisma.content.count({ where: { type: 'SERIES' } }),
        prisma.episode.count(),
        prisma.content.count({ where: { status: 'PUBLISHED' } }),
        prisma.mediaAsset.count({ where: { processingStatus: 'PROCESSING' } }),
        prisma.mediaAsset.count({ where: { processingStatus: 'FAILED' } }),
        prisma.mediaAsset.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, originalFilename: true, processingStatus: true, createdAt: true }
        }),
        prisma.adminAuditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      const storageAggregation = await prisma.mediaAsset.aggregate({
        _sum: {
          fileSize: true
        }
      });
      const storageUsage = storageAggregation._sum.fileSize ? Number(storageAggregation._sum.fileSize) : 0;

      res.json({
        totalMovies,
        totalSeries,
        totalEpisodes,
        publishedCount,
        processingCount,
        failedJobs: failedCount,
        storageUsage,
        recentUploads,
        recentActions
      });
    } catch (error) {
      console.error('[AdminController.getStats]', error);
      res.status(500).json({ error: { message: 'Failed to fetch dashboard stats' } });
    }
  }

}

export const adminController = new AdminController();
