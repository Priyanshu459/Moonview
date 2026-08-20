import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { UnauthorizedError } from '../utils/errors.js';
import { config } from '../config/index.js';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Methods that don't change state are safe
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Ensure double submit cookie pattern
  const csrfCookie = req.cookies.csrfToken;
  const csrfHeader = req.headers['x-csrf-token'] as string;

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new UnauthorizedError('CSRF token missing or invalid');
  }

  next();
}

export function generateCsrfToken(req: Request, res: Response, next: NextFunction) {
  let csrfToken = req.cookies.csrfToken;

  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false, // Must be readable by frontend to attach to headers
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    });
    if (!req.cookies) req.cookies = {};
    req.cookies.csrfToken = csrfToken;
  }

  next();
}
