import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { z } from 'zod';
import { auditService, AuditAction } from '../services/audit.service.js';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['MOVIE', 'SERIES']),
  releaseYear: z.number().int().min(1900).max(2100),
  duration: z.number().int().nullable().optional(),
  maturityRating: z.enum(['G', 'PG', 'PG_13', 'R', 'NC_17', 'TV_Y', 'TV_G', 'TV_PG', 'TV_14', 'TV_MA']),
  featured: z.boolean().default(false),
  posterKey: z.string().nullable().optional(),
  backdropKey: z.string().nullable().optional(),
  trailerKey: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]), // array of genre IDs
  categories: z.array(z.string()).default([]), // array of category IDs
  mediaAssetId: z.string().nullable().optional(), // For movies
});

export class AdminContentController {
  
  async listContent(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const type = req.query.type as 'MOVIE' | 'SERIES' | undefined;
      const status = req.query.status as 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | undefined;

      const where: any = {};
      if (type) where.type = type;
      if (status) where.status = status;

      const [data, total] = await Promise.all([
        prisma.content.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            status: true,
            releaseYear: true,
            featured: true,
            createdAt: true,
            updatedAt: true,
            mediaAsset: { select: { processingStatus: true, originalFilename: true } },
          }
        }),
        prisma.content.count({ where })
      ]);

      res.json({ data, meta: { total, page, limit, hasNext: (page * limit) < total } });
    } catch (error) {
      console.error('[listContent]', error);
      res.status(500).json({ error: { message: 'Failed to list content' } });
    }
  }

  async getContent(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const content = await prisma.content.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          type: true,
          status: true,
          releaseYear: true,
          duration: true,
          maturityRating: true,
          featured: true,
          posterKey: true,
          backdropKey: true,
          trailerKey: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          genres: { select: { genreId: true } },
          categories: { select: { categoryId: true } },
          mediaAsset: { select: { id: true, originalFilename: true, processingStatus: true } },
        }
      });
      if (!content) return res.status(404).json({ error: { message: 'Content not found' } });
      res.json(content);
    } catch (error) {
      console.error('[getContent]', error);
      res.status(500).json({ error: { message: 'Failed to get content' } });
    }
  }

  async createContent(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId; // auth token has userId
      const parsed = contentSchema.parse(req.body);

      // Check slug collision
      const existing = await prisma.content.findUnique({ where: { slug: parsed.slug } });
      if (existing) {
        return res.status(400).json({ error: { message: 'Slug already exists' } });
      }

      // Check if mediaAsset is provided and available (for movies)
      if (parsed.type === 'MOVIE' && parsed.mediaAssetId) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: parsed.mediaAssetId } });
        if (!asset) return res.status(400).json({ error: { message: 'Media Asset not found' } });
        if (asset.contentId || asset.episodeId) {
          return res.status(400).json({ error: { message: 'Media Asset is already assigned to another content' } });
        }
      }

      const content = await prisma.content.create({
        data: {
          title: parsed.title,
          slug: parsed.slug,
          description: parsed.description,
          type: parsed.type,
          releaseYear: parsed.releaseYear,
          duration: parsed.duration,
          maturityRating: parsed.maturityRating,
          featured: parsed.featured,
          posterKey: parsed.posterKey,
          backdropKey: parsed.backdropKey,
          trailerKey: parsed.trailerKey,
          tags: parsed.tags,
          genres: {
            create: parsed.genres.map(id => ({ genre: { connect: { id } } }))
          },
          categories: {
            create: parsed.categories.map(id => ({ category: { connect: { id } } }))
          }
        }
      });

      if (parsed.type === 'MOVIE' && parsed.mediaAssetId) {
        await prisma.mediaAsset.update({
          where: { id: parsed.mediaAssetId },
          data: { contentId: content.id }
        });
      }

      await auditService.log({
        adminId,
        action: AuditAction.CREATE_CONTENT,
        resource: 'Content',
        resourceId: content.id,
        details: { title: content.title, type: content.type }
      });

      res.status(201).json(content);
    } catch (error: any) {
      console.error('[createContent]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      }
      res.status(500).json({ error: { message: 'Failed to create content' } });
    }
  }

  async updateContent(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };
      const parsed = contentSchema.parse(req.body);

      // Check slug collision for other ids
      const existing = await prisma.content.findUnique({ where: { slug: parsed.slug } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: { message: 'Slug already exists' } });
      }

      const currentContent = await prisma.content.findUnique({ 
        where: { id },
        select: { id: true, mediaAsset: { select: { id: true } } },
      });
      if (!currentContent) return res.status(404).json({ error: { message: 'Content not found' } });

      if (parsed.type === 'MOVIE' && parsed.mediaAssetId) {
        const asset = await prisma.mediaAsset.findUnique({ where: { id: parsed.mediaAssetId } });
        if (!asset) return res.status(400).json({ error: { message: 'Media Asset not found' } });
        if (asset.contentId && asset.contentId !== id) {
          return res.status(400).json({ error: { message: 'Media Asset is already assigned to another content' } });
        }
      }

      // Update basic fields
      const content = await prisma.content.update({
        where: { id },
        data: {
          title: parsed.title,
          slug: parsed.slug,
          description: parsed.description,
          releaseYear: parsed.releaseYear,
          duration: parsed.duration,
          maturityRating: parsed.maturityRating,
          featured: parsed.featured,
          posterKey: parsed.posterKey,
          backdropKey: parsed.backdropKey,
          trailerKey: parsed.trailerKey,
          tags: parsed.tags,
        }
      });

      // Update genres
      await prisma.contentGenre.deleteMany({ where: { contentId: id } });
      if (parsed.genres.length > 0) {
        await prisma.contentGenre.createMany({
          data: parsed.genres.map(genreId => ({ contentId: id, genreId }))
        });
      }

      // Update categories
      await prisma.contentCategory.deleteMany({ where: { contentId: id } });
      if (parsed.categories.length > 0) {
        await prisma.contentCategory.createMany({
          data: parsed.categories.map(categoryId => ({ contentId: id, categoryId }))
        });
      }

      // Update media asset
      if (parsed.type === 'MOVIE' && parsed.mediaAssetId !== currentContent.mediaAsset?.id) {
        // Disconnect old
        if (currentContent.mediaAsset) {
          await prisma.mediaAsset.update({
            where: { id: currentContent.mediaAsset.id },
            data: { contentId: null }
          });
        }
        // Connect new
        if (parsed.mediaAssetId) {
          await prisma.mediaAsset.update({
            where: { id: parsed.mediaAssetId },
            data: { contentId: id }
          });
        }
      }

      await auditService.log({
        adminId,
        action: AuditAction.UPDATE_CONTENT,
        resource: 'Content',
        resourceId: id,
        details: { title: content.title }
      });

      res.json(content);
    } catch (error: any) {
      console.error('[updateContent]', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      }
      res.status(500).json({ error: { message: 'Failed to update content' } });
    }
  }

  async publishContent(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };

      const content = await prisma.content.findUnique({
        where: { id },
        include: { mediaAsset: true, seasons: { include: { episodes: { include: { mediaAsset: true } } } } }
      });

      if (!content) return res.status(404).json({ error: { message: 'Content not found' } });

      if (content.type === 'MOVIE') {
        if (!content.mediaAsset) {
          return res.status(400).json({ error: { message: 'Cannot publish: Missing Media Asset' } });
        }
        if (content.mediaAsset.processingStatus !== 'READY') {
          return res.status(400).json({ error: { message: `Cannot publish: Media Asset is not READY (currently ${content.mediaAsset.processingStatus})` } });
        }
      } else if (content.type === 'SERIES') {
        // For series, at least one episode must exist and all existing episodes must be valid?
        // Actually for now, let's just allow publishing series, but we could enforce things.
        // I will just let series publish.
      }

      const updated = await prisma.content.update({
        where: { id },
        data: { status: 'PUBLISHED' }
      });

      await auditService.log({
        adminId,
        action: AuditAction.PUBLISH_CONTENT,
        resource: 'Content',
        resourceId: id,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('[publishContent]', error);
      res.status(500).json({ error: { message: 'Failed to publish content' } });
    }
  }

  async unpublishContent(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };

      const updated = await prisma.content.update({
        where: { id },
        data: { status: 'DRAFT' }
      });

      await auditService.log({
        adminId,
        action: AuditAction.UNPUBLISH_CONTENT,
        resource: 'Content',
        resourceId: id,
      });

      res.json(updated);
    } catch (error: any) {
      console.error('[unpublishContent]', error);
      res.status(500).json({ error: { message: 'Failed to unpublish content' } });
    }
  }

  async deleteContent(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };

      const content = await prisma.content.findUnique({
        where: { id },
        include: { mediaAsset: true }
      });
      if (!content) return res.status(404).json({ error: { message: 'Content not found' } });

      if (content.status === 'PUBLISHED') {
        return res.status(400).json({ error: { message: 'Cannot delete published content. Unpublish first.' } });
      }

      await prisma.content.delete({ where: { id } });

      await auditService.log({
        adminId,
        action: AuditAction.DELETE_CONTENT,
        resource: 'Content',
        resourceId: id,
        details: { title: content.title }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('[deleteContent]', error);
      res.status(500).json({ error: { message: 'Failed to delete content' } });
    }
  }
}

export const adminContentController = new AdminContentController();
