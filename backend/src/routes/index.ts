// =============================================================================
// Moonview Backend — API Router
// Central mount point for all API route groups.
// Each phase will add its routes here.
// =============================================================================

import { Router } from 'express';
import { healthRouter } from './health.js';
import authRouter from './auth.js';
import uploadRouter from './upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { generateCsrfToken } from '../middleware/csrf.js';

const router = Router();

// Ensure CSRF token is generated for clients
router.use(generateCsrfToken);

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
router.use('/health', healthRouter);

// ---------------------------------------------------------------------------
// Phase 3+: Auth routes
// ---------------------------------------------------------------------------
router.use('/auth', authRouter);

// Test protected route
router.get('/test-protected', authenticateToken, requireAdmin, (req, res) => {
  res.json({ success: true, message: 'You have accessed a protected route!', user: req.user });
});

// ---------------------------------------------------------------------------
// Phase 5: Upload routes
// ---------------------------------------------------------------------------
router.use('/uploads', uploadRouter);

import adminRouter from './admin.route.js';
router.use('/admin', adminRouter);

// ---------------------------------------------------------------------------
// Phase 7+: Content routes
import contentRouter from './content.route.js';
router.use('/content', contentRouter);
// router.use('/genres', genreRouter);
// router.use('/categories', categoryRouter);
import searchRouter from './search.route.js';
router.use('/search', searchRouter);
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Phase 7+: Streaming routes
import streamRouter from './stream.route.js';
router.use('/stream', streamRouter);
import progressRouter from './progress.route.js';
router.use('/progress', progressRouter);
// ---------------------------------------------------------------------------

export { router as apiRouter };
