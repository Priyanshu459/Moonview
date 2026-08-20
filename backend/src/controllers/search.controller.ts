import { Request, Response } from 'express';
import { searchService } from '../services/search.service.js';
import { rateLimit } from 'express-rate-limit';

// Dedicated rate limiter for search to prevent abuse
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many search requests, please try again later.',
    },
  },
});

export class SearchController {
  async search(req: Request, res: Response) {
    try {
      const q = (req.query.q as string) || '';
      
      // Normalize and collapse whitespace
      const normalizedQuery = q.replace(/\s+/g, ' ').trim();

      if (!normalizedQuery) {
        return res.json({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            hasNext: false
          }
        });
      }

      if (normalizedQuery.length > 100) {
        return res.status(400).json({ error: { message: 'Search query is too long (max 100 characters)' } });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

      const result = await searchService.searchContent(normalizedQuery, page, limit);

      return res.json(result);
    } catch (error: any) {
      console.error('[SearchController.search] Error:', error);
      return res.status(500).json({ error: { message: 'Failed to perform search' } });
    }
  }
}

export const searchController = new SearchController();
