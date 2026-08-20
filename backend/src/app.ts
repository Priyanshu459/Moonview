// =============================================================================
// Moonview Backend — Express Application Factory
// Creates and configures the Express app instance.
// Separated from the HTTP server so it can be imported in tests without
// binding to a port.
// =============================================================================

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sessionMiddleware } from './middleware/session.js';
import { apiRouter } from './routes/index.js';
import { config } from './config/index.js';
import path from 'node:path';

export function createApp() {
  const app = express();

  // ---------------------------------------------------------------------------
  // Security headers — Helmet
  // ---------------------------------------------------------------------------
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'", 'blob:'], // HLS.js uses blob URLs for media
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  // ---------------------------------------------------------------------------
  // CORS — only allow configured origins
  // ---------------------------------------------------------------------------
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (config.CORS_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS policy does not allow origin: ${origin}`));
      },
      credentials: true, // Required for HTTP-only cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
    }),
  );

  // ---------------------------------------------------------------------------
  // Trust proxy — required when behind Nginx / Cloudflare
  // ---------------------------------------------------------------------------
  app.set('trust proxy', 1);

  // ---------------------------------------------------------------------------
  // Global rate limiting
  // ---------------------------------------------------------------------------
  app.use(
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests — please try again later',
        },
      },
      skip: (req) => {
        // Never rate-limit health checks or static media delivery
        return req.path.startsWith('/api/health') || req.path.startsWith('/media/');
      },
    }),
  );

  // ---------------------------------------------------------------------------
  // Body parsing
  // ---------------------------------------------------------------------------
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ---------------------------------------------------------------------------
  // Cookie & Session parsing
  // ---------------------------------------------------------------------------
  app.use(cookieParser(config.COOKIE_SECRET));
  app.use(sessionMiddleware);

  // ---------------------------------------------------------------------------
  // Request logging (after body parsing, before routes)
  // ---------------------------------------------------------------------------
  app.use(requestLogger);

  // ---------------------------------------------------------------------------
  // API Routes
  // ---------------------------------------------------------------------------
  app.use('/api', apiRouter);

  // ---------------------------------------------------------------------------
  // Static Local Delivery for HLS (Simulating Nginx)
  // ---------------------------------------------------------------------------
  app.use('/media/hls', express.static(path.join(config.PUBLIC_MEDIA_ROOT, 'hls'), {
    setHeaders: (res, p) => {
      if (p.endsWith('.m3u8')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else if (p.endsWith('.ts') || p.endsWith('.m4s') || p.endsWith('.mp4')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  const immutableImageOptions = {
    dotfiles: 'deny' as const,
    fallthrough: false,
    maxAge: '30d',
    immutable: true,
  };
  app.use('/media/posters', express.static(path.join(config.PUBLIC_MEDIA_ROOT, 'posters'), immutableImageOptions));
  app.use('/media/backdrops', express.static(path.join(config.PUBLIC_MEDIA_ROOT, 'backdrops'), immutableImageOptions));

  // ---------------------------------------------------------------------------
  // 404 — must come after all routes
  // ---------------------------------------------------------------------------
  app.use(notFoundHandler);

  // ---------------------------------------------------------------------------
  // Global error handler — must be LAST with 4 arguments
  // ---------------------------------------------------------------------------
  app.use(errorHandler);

  return app;
}
