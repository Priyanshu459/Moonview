import { prisma } from '../config/database.js';

export class ProgressService {
  /**
   * Update watch progress for a given user and media asset
   */
  async updateProgress(identity: { sessionId?: string, userId?: string }, mediaAssetId: string, position: number, duration: number) {
    if (duration <= 0) return null;
    
    // Clamp position between 0 and duration
    const clampedPosition = Math.max(0, Math.min(position, duration));
    const percentage = (clampedPosition / duration) * 100;
    const completed = percentage >= 90;

    // Find the associated content and episode
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      select: {
        contentId: true,
        episodeId: true,
        episode: { select: { season: { select: { seriesId: true } } } },
      }
    });

    if (!mediaAsset) {
      throw new Error('Media asset not found');
    }

    if (!mediaAsset.contentId && !mediaAsset.episodeId) {
      throw new Error('Media asset is not associated with content or episode');
    }

    let resolvedContentId = mediaAsset.contentId;
    if (!resolvedContentId && mediaAsset.episode) {
      resolvedContentId = mediaAsset.episode.season.seriesId;
    }

    if (!resolvedContentId) {
      throw new Error('Could not resolve content ID for media asset');
    }

    // Determine the unique where condition based on provided identity
    const whereCondition = identity.userId 
      ? { userId_mediaAssetId: { userId: identity.userId, mediaAssetId } }
      : { sessionId_mediaAssetId: { sessionId: identity.sessionId!, mediaAssetId } };

    return prisma.watchProgress.upsert({
      where: whereCondition,
      create: {
        userId: identity.userId || null,
        sessionId: identity.sessionId || null,
        mediaAssetId,
        contentId: resolvedContentId,
        episodeId: mediaAsset.episodeId,
        position: clampedPosition,
        duration,
        percentage,
        completed
      },
      update: {
        position: clampedPosition,
        duration,
        percentage,
        completed,
        updatedAt: new Date()
      },
      select: { id: true },
    });
  }

  /**
   * Get continue watching items for a user
   */
  async getContinueWatching(identity: { sessionId?: string, userId?: string }) {
    const whereCondition: any = {
      completed: false,
      position: { gt: 0 }
    };
    
    if (identity.userId) {
      whereCondition.userId = identity.userId;
    } else {
      whereCondition.sessionId = identity.sessionId;
    }

    const progressRecords = await prisma.watchProgress.findMany({
      where: whereCondition,
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        mediaAssetId: true,
        position: true,
        duration: true,
        percentage: true,
        completed: true,
        updatedAt: true,
        content: {
          select: { id: true, title: true, slug: true, posterKey: true, type: true },
        },
        episode: {
          select: {
            title: true,
            episodeNumber: true,
            thumbnailKey: true,
            season: { select: { seasonNumber: true, posterKey: true } },
          }
        },
      },
      take: 20
    });

    // Format to match frontend ContentRow expected items
    return progressRecords.map((record: any) => {
      const isEpisode = !!record.episode;
      const title = isEpisode 
        ? `${record.content.title} - S${record.episode!.season.seasonNumber}E${record.episode!.episodeNumber}: ${record.episode!.title}`
        : record.content.title;
        
      const poster = isEpisode 
        ? record.episode!.thumbnailKey || record.episode!.season.posterKey || record.content.posterKey
        : record.content.posterKey;

      return {
        id: record.content.id,
        mediaId: record.mediaAssetId,
        title,
        slug: record.content.slug,
        poster: poster ? `/media/${poster}` : null,
        type: record.content.type,
        position: record.position,
        duration: record.duration,
        percentage: record.percentage,
        completed: record.completed,
        updatedAt: record.updatedAt
      };
    });
  }
}

export const progressService = new ProgressService();
