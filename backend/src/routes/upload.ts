import { Router } from 'express';
import { uploadVideo, uploadPoster, uploadBackdrop } from '../controllers/upload.controller.js';
import { uploadVideo as uploadVideoMiddleware, uploadPoster as uploadPosterMiddleware, uploadBackdrop as uploadBackdropMiddleware, handleMulterError } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { csrfMiddleware } from '../middleware/csrf.js';

const router = Router();

// Protect all upload endpoints
router.use(authenticateToken, requireAdmin, csrfMiddleware);

router.post(
  '/video',
  uploadVideoMiddleware.single('file'),
  handleMulterError,
  uploadVideo
);

router.post(
  '/poster',
  uploadPosterMiddleware.single('file'),
  handleMulterError,
  uploadPoster
);

router.post(
  '/backdrop',
  uploadBackdropMiddleware.single('file'),
  handleMulterError,
  uploadBackdrop
);

export default router;
