import { Router } from 'express';
import { progressController } from '../controllers/progress.controller.js';
import { authenticateTokenOptional } from '../middleware/auth.js';
import { csrfMiddleware } from '../middleware/csrf.js';

const router = Router();

router.use(authenticateTokenOptional);
router.put('/', csrfMiddleware, progressController.updateProgress);
router.get('/continue-watching', progressController.getContinueWatching);

export default router;
