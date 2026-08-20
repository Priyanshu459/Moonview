import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import fs from 'node:fs';
import { storageService } from '../services/storage.service.js';
import { publicMediaUrlForPrivateKey } from '../services/media-exposure.service.js';

/**
 * Validates if the media asset can be publicly streamed.
 * Must be READY, and associated content must be PUBLISHED.
 */
async function validateMediaAccess(mediaId: string) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      processingStatus: true,
      hlsMasterKey: true,
      content: { select: { status: true } },
      episode: {
        select: {
          status: true,
          season: {
            select: { series: { select: { status: true } } }
          }
        }
      }
    }
  });

  if (!asset) {
    throw new NotFoundError('Media not found');
  }

  if (asset.processingStatus !== 'READY') {
    throw new ForbiddenError('Media is not ready for playback');
  }

  let isPublished = false;

  if (asset.content) {
    isPublished = asset.content.status === 'PUBLISHED';
  } else if (asset.episode) {
    isPublished = asset.episode.status === 'PUBLISHED' && asset.episode.season.series.status === 'PUBLISHED';
  }

  if (!isPublished) {
    throw new ForbiddenError('Content is not published');
  }

  return asset;
}

export const getStreamInfo = async (req: Request, res: Response) => {
  const mediaId = req.params.mediaId as string;

  const asset = await validateMediaAccess(mediaId);

  let resumePosition = 0;
  const sessionId = req.signedCookies?.sessionId;
  
  if (sessionId) {
    const progress = await prisma.watchProgress.findUnique({
      where: { sessionId_mediaAssetId: { sessionId, mediaAssetId: mediaId } },
      select: { position: true, completed: true }
    });

    if (progress && !progress.completed) {
      resumePosition = progress.position;
    }
  }

  res.json({
    success: true,
    data: {
      mediaId: asset.id,
      hlsUrl: asset.hlsMasterKey ? publicMediaUrlForPrivateKey(asset.hlsMasterKey) : null,
      fallbackUrl: `/api/stream/${asset.id}/fallback`,
      resumePosition
    }
  });
};

export const streamFallbackMp4 = async (req: Request, res: Response) => {
  const mediaId = req.params.mediaId as string;

  // 1. Authorize and fetch asset
  const asset = await validateMediaAccess(mediaId);

  // 2. Resolve safe path
  const storageKey = asset.storageKey; 
  if (!storageKey) {
    throw new NotFoundError('Storage key not found');
  }

  const securePath = storageService.getUri(storageKey);

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(securePath);
  } catch (err) {
    throw new NotFoundError('Media file not found on storage');
  }

  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', asset.mimeType || 'video/mp4');

  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', fileSize);
    return res.end();
  }

  if (range) {
    // Parse Range
    const parts = range.replace(/bytes=/, "").split("-");
    const startStr = parts[0];
    const endStr = parts[1];

    if (!startStr && !endStr) {
      res.status(416).json({ success: false, error: { message: 'Range not satisfiable', code: 'RANGE_NOT_SATISFIABLE' }});
      return;
    }

    let start = 0;
    let end = fileSize - 1;
    
    if (startStr && !endStr) {
      // bytes=100-
      start = parseInt(startStr, 10);
    } else if (!startStr && endStr) {
      // bytes=-100 (last 100 bytes)
      const lastN = parseInt(endStr, 10);
      start = Math.max(fileSize - lastN, 0);
    } else if (startStr && endStr) {
      // bytes=100-200
      start = parseInt(startStr, 10);
      end = parseInt(endStr, 10);
    }

    if (isNaN(start) || isNaN(end) || start >= fileSize || start > end) {
      res.status(416);
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.json({ success: false, error: { message: 'Range not satisfiable', code: 'RANGE_NOT_SATISFIABLE' }});
      return;
    }
    
    // Ensure end doesn't exceed fileSize - 1
    end = Math.min(end, fileSize - 1);

    const chunkSize = (end - start) + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    const fileStream = fs.createReadStream(securePath, { start, end });
    res.once('close', () => fileStream.destroy());
    
    fileStream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    res.status(200);
    const fileStream = fs.createReadStream(securePath);
    res.once('close', () => fileStream.destroy());
    fileStream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    fileStream.pipe(res);
  }
};
