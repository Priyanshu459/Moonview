import { Router } from 'express';
import { getStreamInfo, streamFallbackMp4 } from '../controllers/stream.controller.js';
import { authenticateTokenOptional } from '../middleware/auth.js';

const router = Router();

// Retrieve stream URLs and metadata (verifies published + ready)
router.get('/:mediaId', authenticateTokenOptional, getStreamInfo);

// Direct MP4 streaming fallback with HTTP Range support
router.get('/:mediaId/fallback', authenticateTokenOptional, streamFallbackMp4);

export default router;
