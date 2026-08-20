import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { csrfMiddleware } from '../middleware/csrf.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX || 10,
  message: {
    success: false,
    error: {
      message: 'Too many login attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validateRequest(loginSchema), login);
router.post('/logout', csrfMiddleware, logout);
router.get('/me', authenticateToken, me);

export default router;
