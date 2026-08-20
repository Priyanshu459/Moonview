import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { z } from 'zod';
import { auditService, AuditAction } from '../services/audit.service.js';
import { mediaExposureService } from '../services/media-exposure.service.js';

const seasonSchema = z.object({
  seasonNumber: z.number().int().min(1),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  releaseYear: z.number().int().optional(),
  posterKey: z.string().nullable().optional()
});

const episodeSchema = z.object({
  episodeNumber: z.number().int().min(1),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  duration: z.number().int().nullable().optional(),
  thumbnailKey: z.string().nullable().optional(),
  mediaAssetId: z.string().nullable().optional(),
});

export class AdminSeriesController {

  // SEASONS
  
  async listSeasons(req: Request, res: Response) {
    try {
      const { seriesId } = req.params as { seriesId: string };
      const seasons = await prisma.season.findMany({
        where: { seriesId },
        orderBy: { seasonNumber: 'asc' },
        include: { _count: { select: { episodes: true } } }
      });
      res.json(seasons);
    } catch (error) {
      res.status(500).json({ error: { message: 'Failed to list seasons' } });
    }
  }

  async createSeason(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { seriesId } = req.params as { seriesId: string };
      const parsed = seasonSchema.parse(req.body);
      
      const existing = await prisma.season.findUnique({ where: { seriesId_seasonNumber: { seriesId, seasonNumber: parsed.seasonNumber } } });
      if (existing) return res.status(400).json({ error: { message: 'Season number already exists for this series' } });

      const season = await prisma.season.create({
        data: { ...parsed, seriesId }
      });

      await auditService.log({
        adminId,
        action: AuditAction.CREATE_SEASON,
        resource: 'Season',
        resourceId: season.id,
        details: { seriesId, seasonNumber: season.seasonNumber }
      });

      res.status(201).json(season);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to create season' } });
    }
  }

  async updateSeason(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { seriesId, seasonId } = req.params as { seriesId: string, seasonId: string };
      const parsed = seasonSchema.parse(req.body);
      
      const existing = await prisma.season.findUnique({ where: { seriesId_seasonNumber: { seriesId, seasonNumber: parsed.seasonNumber } } });
      if (existing && existing.id !== seasonId) return res.status(400).json({ error: { message: 'Season number already exists for this series' } });

      const season = await prisma.season.update({
        where: { id: seasonId },
        data: parsed
      });

      await auditService.log({
        adminId,
        action: AuditAction.UPDATE_SEASON,
        resource: 'Season',
        resourceId: season.id,
      });

      res.json(season);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to update season' } });
    }
  }

  async deleteSeason(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { seasonId } = req.params as { seasonId: string };
      
      const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { episodes: true } });
      if (!season) return res.status(404).json({ error: { message: 'Season not found' } });
      
      if (season.episodes.length > 0) {
        return res.status(400).json({ error: { message: 'Cannot delete season with episodes. Delete episodes first.' } });
      }

      await prisma.season.delete({ where: { id: seasonId } });

      await auditService.log({
        adminId,
        action: AuditAction.DELETE_SEASON,
        resource: 'Season',
        resourceId: seasonId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: { message: 'Failed to delete season' } });
    }
  }

  // EPISODES

  async listEpisodes(req: Request, res: Response) {
    try {
      const { seasonId } = req.params as { seasonId: string };
      const episodes = await prisma.episode.findMany({
        where: { seasonId },
        orderBy: { episodeNumber: 'asc' },
        include: { mediaAsset: { select: { id: true, originalFilename: true, processingStatus: true } } }
      });
      res.json(episodes);
    } catch (error) {
      res.status(500).json({ error: { message: 'Failed to list episodes' } });
    }
  }

  async createEpisode(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { seasonId } = req.params as { seasonId: string };
      const parsed = episodeSchema.parse(req.body);

      const existing = await prisma.episode.findUnique({ where: { seasonId_episodeNumber: { seasonId, episodeNumber: parsed.episodeNumber } } });
      if (existing) return res.status(400).json({ error: { message: 'Episode number already exists in this season' } });

      if (parsed.mediaAssetId) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: parsed.mediaAssetId } });
        if (!asset) return res.status(400).json({ error: { message: 'Media Asset not found' } });
        if (asset.contentId || asset.episodeId) {
          return res.status(400).json({ error: { message: 'Media Asset is already assigned' } });
        }
      }

      const episode = await prisma.episode.create({
        data: {
          seasonId,
          episodeNumber: parsed.episodeNumber,
          title: parsed.title,
          description: parsed.description,
          duration: parsed.duration,
          thumbnailKey: parsed.thumbnailKey
        }
      });

      if (parsed.mediaAssetId) {
        await prisma.mediaAsset.update({
          where: { id: parsed.mediaAssetId },
          data: { episodeId: episode.id }
        });
      }

      await auditService.log({
        adminId,
        action: AuditAction.CREATE_EPISODE,
        resource: 'Episode',
        resourceId: episode.id,
      });

      res.status(201).json(episode);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to create episode' } });
    }
  }

  async updateEpisode(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { seasonId, episodeId } = req.params as { seasonId: string, episodeId: string };
      const parsed = episodeSchema.parse(req.body);

      const currentEpisode = await prisma.episode.findUnique({ where: { id: episodeId }, include: { mediaAsset: true } });
      if (!currentEpisode) return res.status(404).json({ error: { message: 'Episode not found' } });

      const existing = await prisma.episode.findUnique({ where: { seasonId_episodeNumber: { seasonId, episodeNumber: parsed.episodeNumber } } });
      if (existing && existing.id !== episodeId) return res.status(400).json({ error: { message: 'Episode number already exists in this season' } });

      if (parsed.mediaAssetId && parsed.mediaAssetId !== currentEpisode.mediaAsset?.id) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: parsed.mediaAssetId } });
        if (!asset) return res.status(400).json({ error: { message: 'Media Asset not found' } });
        if (asset.contentId || (asset.episodeId && asset.episodeId !== episodeId)) {
          return res.status(400).json({ error: { message: 'Media Asset is already assigned' } });
        }
      }

      const episode = await prisma.episode.update({
        where: { id: episodeId },
        data: {
          episodeNumber: parsed.episodeNumber,
          title: parsed.title,
          description: parsed.description,
          duration: parsed.duration,
          thumbnailKey: parsed.thumbnailKey
        }
      });

      if (parsed.mediaAssetId !== currentEpisode.mediaAsset?.id) {
        if (currentEpisode.mediaAsset) {
          await prisma.mediaAsset.update({ where: { id: currentEpisode.mediaAsset.id }, data: { episodeId: null } });
        }
        if (parsed.mediaAssetId) {
          await prisma.mediaAsset.update({ where: { id: parsed.mediaAssetId }, data: { episodeId: episodeId } });
        }
      }

      await auditService.log({
        adminId,
        action: AuditAction.UPDATE_EPISODE,
        resource: 'Episode',
        resourceId: episode.id,
      });

      res.json(episode);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to update episode' } });
    }
  }

  async deleteEpisode(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { episodeId } = req.params as { episodeId: string };
      
      const episode = await prisma.episode.findUnique({ where: { id: episodeId }, include: { mediaAsset: true } });
      if (!episode) return res.status(404).json({ error: { message: 'Episode not found' } });

      if (episode.status === 'PUBLISHED') {
        return res.status(400).json({ error: { message: 'Cannot delete published episode. Unpublish first.' } });
      }

      await prisma.episode.delete({ where: { id: episodeId } });

      await auditService.log({
        adminId,
        action: AuditAction.DELETE_EPISODE,
        resource: 'Episode',
        resourceId: episodeId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: { message: 'Failed to delete episode' } });
    }
  }

  async publishEpisode(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { episodeId } = req.params as { episodeId: string };

      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: { mediaAsset: true, season: { include: { series: true } } }
      });
      if (!episode) return res.status(404).json({ error: { message: 'Episode not found' } });

      if (episode.season.series.status !== 'PUBLISHED') {
        // Warning: Series is not published, but episode can be marked published
      }

      if (!episode.mediaAsset) {
        return res.status(400).json({ error: { message: 'Cannot publish: Missing Media Asset' } });
      }
      if (episode.mediaAsset.processingStatus !== 'READY') {
        return res.status(400).json({ error: { message: `Cannot publish: Media Asset is not READY (currently ${episode.mediaAsset.processingStatus})` } });
      }
      await mediaExposureService.exposeAsset(episode.mediaAsset);
      if (episode.thumbnailKey) await mediaExposureService.exposeKey(episode.thumbnailKey);

      const updated = await prisma.episode.update({
        where: { id: episodeId },
        data: { status: 'PUBLISHED' }
      });

      await auditService.log({
        adminId,
        action: AuditAction.PUBLISH_CONTENT,
        resource: 'Episode',
        resourceId: episodeId,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: { message: 'Failed to publish episode' } });
    }
  }

  async unpublishEpisode(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { episodeId } = req.params as { episodeId: string };

      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: { mediaAsset: true },
      });
      if (!episode) return res.status(404).json({ error: { message: 'Episode not found' } });

      if (episode.mediaAsset) await mediaExposureService.revokeAsset(episode.mediaAsset);
      if (episode.thumbnailKey) await mediaExposureService.revokeKey(episode.thumbnailKey);

      const updated = await prisma.episode.update({
        where: { id: episodeId },
        data: { status: 'DRAFT' }
      });

      await auditService.log({
        adminId,
        action: AuditAction.UNPUBLISH_CONTENT,
        resource: 'Episode',
        resourceId: episodeId,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: { message: 'Failed to unpublish episode' } });
    }
  }

}

export const adminSeriesController = new AdminSeriesController();
