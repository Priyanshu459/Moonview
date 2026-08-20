import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';

export class SearchService {
  /**
   * Search across published content with deterministic relevance ordering.
   */
  async searchContent(query: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const exactMatch = `${query}`;
    const prefixMatch = `${query}%`;
    const partialMatch = `%${query}%`;

    // 1. Fetch the paginated and ordered raw results
    const results: any[] = await prisma.$queryRaw`
        SELECT 
          c.id, c.title, c.slug, c.type, c."posterKey",
          CASE
            WHEN c.title ILIKE ${exactMatch} THEN 1
            WHEN c.title ILIKE ${prefixMatch} THEN 2
            WHEN c.title ILIKE ${partialMatch} THEN 3
            WHEN EXISTS (
              SELECT 1 FROM "content_genres" cg
              JOIN "genres" g ON cg."genreId" = g.id
              WHERE cg."contentId" = c.id AND g.name ILIKE ${partialMatch}
            ) THEN 4
            WHEN c.description ILIKE ${partialMatch} THEN 5
            ELSE 6
          END as "_relevance"
        FROM "content" c
        WHERE c.status = 'PUBLISHED'
        AND (
          c.title ILIKE ${partialMatch}
          OR c.description ILIKE ${partialMatch}
          OR EXISTS (
            SELECT 1 FROM "content_genres" cg
            JOIN "genres" g ON cg."genreId" = g.id
            WHERE cg."contentId" = c.id AND g.name ILIKE ${partialMatch}
          )
        )
        ORDER BY "_relevance" ASC, c.title ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

    // 2. Count total matches for pagination metadata
    const countResult: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as total
        FROM "content" c
        WHERE c.status = 'PUBLISHED'
        AND (
          c.title ILIKE ${partialMatch}
          OR c.description ILIKE ${partialMatch}
          OR EXISTS (
            SELECT 1 FROM "content_genres" cg
            JOIN "genres" g ON cg."genreId" = g.id
            WHERE cg."contentId" = c.id AND g.name ILIKE ${partialMatch}
          )
        )
      `;

    const total = countResult[0]?.total || 0;
    const hasNext = (offset + limit) < total;

    // Optional: map to camelCase if strictly needed, though Prisma.$queryRaw
    // returns columns exactly as they are defined in DB.
    // In our schema, the map names are e.g. "posterKey" because we didn't specify @@map on fields.
    // Let's verify this. Wait, Prisma usually keeps camelCase field names if not mapped.
    
    return {
      data: results.map(r => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        type: r.type,
        posterUrl: r.posterKey ? `/media/${r.posterKey}` : null,
      })),
      meta: {
        total,
        page,
        limit,
        hasNext
      }
    };
  }
}

export const searchService = new SearchService();
