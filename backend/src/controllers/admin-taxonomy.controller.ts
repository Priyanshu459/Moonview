import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { z } from 'zod';
import { auditService, AuditAction } from '../services/audit.service.js';

const taxonomySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/)
});

export class AdminTaxonomyController {

  async listGenres(req: Request, res: Response) {
    try {
      const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
      res.json(genres);
    } catch (error) {
      console.error('[listGenres]', error);
      res.status(500).json({ error: { message: 'Failed to list genres' } });
    }
  }

  async createGenre(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const parsed = taxonomySchema.parse(req.body);
      
      const genre = await prisma.genre.create({ data: parsed });
      
      await auditService.log({
        adminId,
        action: AuditAction.CREATE_GENRE,
        resource: 'Genre',
        resourceId: genre.id,
        details: { name: genre.name }
      });

      res.status(201).json(genre);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to create genre' } });
    }
  }

  async updateGenre(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };
      const parsed = taxonomySchema.parse(req.body);
      
      const genre = await prisma.genre.update({ where: { id }, data: parsed });
      
      await auditService.log({
        adminId,
        action: AuditAction.UPDATE_GENRE,
        resource: 'Genre',
        resourceId: genre.id,
        details: { name: genre.name }
      });

      res.json(genre);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to update genre' } });
    }
  }

  async deleteGenre(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };

      const count = await prisma.contentGenre.count({ where: { genreId: id } });
      if (count > 0) {
        return res.status(400).json({ error: { message: 'Cannot delete genre because it is in use' } });
      }

      await prisma.genre.delete({ where: { id } });

      await auditService.log({
        adminId,
        action: AuditAction.DELETE_GENRE,
        resource: 'Genre',
        resourceId: id,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: 'Failed to delete genre' } });
    }
  }

  // Categories

  async listCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
      res.json(categories);
    } catch (error) {
      console.error('[listCategories]', error);
      res.status(500).json({ error: { message: 'Failed to list categories' } });
    }
  }

  async createCategory(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const parsed = taxonomySchema.extend({
        description: z.string().optional(),
        sortOrder: z.number().int().default(0)
      }).parse(req.body);
      
      const category = await prisma.category.create({ data: parsed });
      
      await auditService.log({
        adminId,
        action: AuditAction.CREATE_CATEGORY,
        resource: 'Category',
        resourceId: category.id,
        details: { name: category.name }
      });

      res.status(201).json(category);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to create category' } });
    }
  }

  async updateCategory(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };
      const parsed = taxonomySchema.extend({
        description: z.string().optional(),
        sortOrder: z.number().int().default(0)
      }).parse(req.body);
      
      const category = await prisma.category.update({ where: { id }, data: parsed });
      
      await auditService.log({
        adminId,
        action: AuditAction.UPDATE_CATEGORY,
        resource: 'Category',
        resourceId: category.id,
        details: { name: category.name }
      });

      res.json(category);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: { message: 'Validation failed', details: (error as any).errors } });
      res.status(500).json({ error: { message: 'Failed to update category' } });
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const adminId = (req as any).user.userId;
      const { id } = req.params as { id: string };

      const count = await prisma.contentCategory.count({ where: { categoryId: id } });
      if (count > 0) {
        return res.status(400).json({ error: { message: 'Cannot delete category because it is in use' } });
      }

      await prisma.category.delete({ where: { id } });

      await auditService.log({
        adminId,
        action: AuditAction.DELETE_CATEGORY,
        resource: 'Category',
        resourceId: id,
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: { message: 'Failed to delete category' } });
    }
  }

}

export const adminTaxonomyController = new AdminTaxonomyController();
