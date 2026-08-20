import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { storageService } from '../services/storage.service.js';
import { AppError, ValidationError, InvalidMimeTypeError } from '../utils/errors.js';
import { getVideoQueue } from '../queue/index.js';

export const uploadVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError('No video file provided');
    }

    if (req.file.size === 0) {
      // The file was empty. Cleanup.
      await storageService.delete(req.file.path).catch(() => {});
      throw new ValidationError('Uploaded file is empty');
    }

    const { originalname, mimetype, size, path: storageKey } = req.file;

    let persisted: { mediaAsset: { id: string }; uploadJob: { id: string; status: string } } | undefined;
    try {
      // Using a database transaction to ensure MediaAsset and UploadJob are coupled
      persisted = await prisma.$transaction(async (tx: any) => {
        const mediaAsset = await tx.mediaAsset.create({
          data: {
            originalFilename: originalname,
            storageKey,
            mimeType: mimetype,
            fileSize: size,
            processingStatus: 'PENDING',
            // Staged media asset: contentId and episodeId are left null
          },
        });

        const uploadJob = await tx.uploadJob.create({
          data: {
            mediaAssetId: mediaAsset.id,
            originalFilename: originalname,
            mimeType: mimetype,
            fileSize: size,
            status: 'PENDING', // PENDING serves as the queued state in our schema
          },
        });

        return { mediaAsset, uploadJob };
      });

      // Enqueue to BullMQ
      await getVideoQueue().add(
        'process-video',
        {
            jobId: persisted.uploadJob.id,
            mediaAssetId: persisted.mediaAsset.id,
        },
        {
          jobId: persisted.uploadJob.id, // BullMQ native jobId deduplication
        }
      );

      res.status(201).json({
        success: true,
        data: {
          uploadId: persisted.uploadJob.id,
          mediaAssetId: persisted.mediaAsset.id,
          storageKey,
          originalFilename: originalname,
          mimeType: mimetype,
          size,
          status: persisted.uploadJob.status,
        },
      });
    } catch (persistenceOrQueueError) {
      if (!persisted) {
        // If DB insertion fails, delete the saved file to avoid an orphan.
        await storageService.delete(storageKey).catch(() => {});
        throw persistenceOrQueueError;
      }

      // The original upload is intentionally retained when Redis is down so
      // an administrator can safely requeue it after recovery.
      await prisma.$transaction([
        prisma.uploadJob.update({
          where: { id: persisted.uploadJob.id },
          data: { status: 'FAILED', errorMessage: 'Processing queue is temporarily unavailable' },
        }),
        prisma.mediaAsset.update({
          where: { id: persisted.mediaAsset.id },
          data: { processingStatus: 'FAILED', errorMessage: 'Processing queue is temporarily unavailable' },
        }),
      ]).catch(() => {});
      throw new AppError('Upload saved, but processing could not be queued', 503, 'SERVICE_UNAVAILABLE');
    }
  } catch (error) {
    next(error);
  }
};

export const uploadPoster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError('No poster file provided');
    }

    if (req.file.size === 0) {
      await storageService.delete(req.file.path).catch(() => {});
      throw new ValidationError('Uploaded file is empty');
    }

    // Posters don't get a MediaAsset immediately. They are attached directly to Content models via storageKey.
    res.status(201).json({
      success: true,
      data: {
        storageKey: req.file.path,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadBackdrop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError('No backdrop file provided');
    }

    if (req.file.size === 0) {
      await storageService.delete(req.file.path).catch(() => {});
      throw new ValidationError('Uploaded file is empty');
    }

    res.status(201).json({
      success: true,
      data: {
        storageKey: req.file.path,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};
