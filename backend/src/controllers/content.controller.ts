import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export async function getHomeContent(req: Request, res: Response) {
  try {
    const [featured, recentlyAdded, popularMovies] = await Promise.all([
      prisma.content.findMany({
        where: { status: 'PUBLISHED', featured: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, slug: true, title: true, posterKey: true, backdropKey: true, type: true, description: true }
      }),
      prisma.content.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, slug: true, title: true, posterKey: true, type: true }
      }),
      prisma.content.findMany({
        where: { status: 'PUBLISHED', type: 'MOVIE' },
        orderBy: { updatedAt: 'desc' }, // Proxy for popular for now
        take: 15,
        select: { id: true, slug: true, title: true, posterKey: true, type: true }
      })
    ]);

    // For Continue Watching, this requires user authentication, handled in a different endpoint/flow,
    // but the frontend merges it.

    const rows = [];

    if (recentlyAdded.length > 0) {
      rows.push({
        title: 'Recently Added',
        items: recentlyAdded.map((c: any) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          posterUrl: c.posterKey ? `/media/${c.posterKey}` : null,
          type: c.type,
        }))
      });
    }

    if (popularMovies.length > 0) {
      rows.push({
        title: 'Popular Movies',
        items: popularMovies.map((c: any) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          posterUrl: c.posterKey ? `/media/${c.posterKey}` : null,
          type: c.type,
        }))
      });
    }

    let hero = null;
    if (featured.length > 0) {
      const h = featured[0]!;
      hero = {
        id: h.id,
        title: h.title,
        description: h.description,
        slug: h.slug,
        type: h.type,
        backdropUrl: h.backdropKey ? `/media/${h.backdropKey}` : null,
      };
    } else if (recentlyAdded.length > 0) {
      const h = recentlyAdded[0]!;
      hero = {
        id: h.id,
        title: h.title,
        description: 'Discover the latest additions to Moonview.',
        slug: h.slug,
        type: h.type,
        backdropUrl: null, // Fallback if no backdrop
      };
    }

    res.json({ hero, rows });
  } catch (error) {
    console.error('Error fetching home content:', error);
    res.status(500).json({ error: 'Failed to fetch home content' });
  }
}
export async function getBrowseContent(req: Request, res: Response) {
  try {
    const mapContentItem = (c: any) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      posterUrl: c.posterKey ? `/media/${c.posterKey}` : null,
      type: c.type,
    });

    const [allContent, movies, series, categories, genres] = await Promise.all([
      prisma.content.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: { id: true, slug: true, title: true, posterKey: true, type: true }
      }),
      prisma.content.findMany({
        where: { status: 'PUBLISHED', type: 'MOVIE' },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: { id: true, slug: true, title: true, posterKey: true, type: true }
      }),
      prisma.content.findMany({
        where: { status: 'PUBLISHED', type: 'SERIES' },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: { id: true, slug: true, title: true, posterKey: true, type: true }
      }),
      prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          content: {
            where: { content: { status: 'PUBLISHED' } },
            take: 18,
            select: {
              content: { select: { id: true, slug: true, title: true, posterKey: true, type: true } }
            }
          }
        }
      }),
      prisma.genre.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          content: {
            where: { content: { status: 'PUBLISHED' } },
            take: 18,
            select: {
              content: { select: { id: true, slug: true, title: true, posterKey: true, type: true } }
            }
          }
        }
      }),
    ]);

    const rows: Array<{ title: string; items: any[] }> = [];

    if (allContent.length > 0) {
      rows.push({ title: 'All Content', items: allContent.map(mapContentItem) });
    }

    if (movies.length > 0) {
      rows.push({ title: 'Movies', items: movies.map(mapContentItem) });
    }

    if (series.length > 0) {
      rows.push({ title: 'Series', items: series.map(mapContentItem) });
    }

    for (const category of categories) {
      const items = category.content.map((entry: any) => mapContentItem(entry.content));
      if (items.length > 0) rows.push({ title: category.name, items });
    }

    for (const genre of genres) {
      const items = genre.content.map((entry: any) => mapContentItem(entry.content));
      if (items.length > 0) rows.push({ title: genre.name, items });
    }

    res.json({ rows });
  } catch (error) {
    console.error('Error fetching browse content:', error);
    res.status(500).json({ error: 'Failed to fetch browse content' });
  }
}