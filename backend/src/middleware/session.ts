import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { config } from '../config/index.js';

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  let sessionId = req.signedCookies?.sessionId;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    // Set cookie for 1 year
    res.cookie('sessionId', sessionId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
      signed: true,
    });
    // Make available immediately on req.signedCookies for subsequent handlers
    if (!req.signedCookies) req.signedCookies = {};
    req.signedCookies.sessionId = sessionId;
  }

  next();
}
