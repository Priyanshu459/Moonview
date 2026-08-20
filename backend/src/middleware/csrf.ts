import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { UnauthorizedError } from '../utils/errors.js';
import { config } from '../config/index.js';

const csrfSecret = config.CSRF_SECRET ?? config.COOKIE_SECRET;

function signCsrfNonce(nonce: string): string {
  return crypto.createHmac('sha256', csrfSecret).update(nonce).digest('base64url');
}

function createCsrfToken(): string {
  const nonce = crypto.randomBytes(32).toString('base64url');
  return `${nonce}.${signCsrfNonce(nonce)}`;
}

function isValidCsrfToken(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  const [nonce, signature, extra] = token.split('.');
  if (!nonce || !signature || extra !== undefined) return false;
  const expected = signCsrfNonce(nonce);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Methods that don't change state are safe
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Ensure double submit cookie pattern
  const csrfCookie = req.cookies.csrfToken;
  const csrfHeader = req.headers['x-csrf-token'] as string;

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader || !isValidCsrfToken(csrfCookie)) {
    throw new UnauthorizedError('CSRF token missing or invalid');
  }

  next();
}

export function generateCsrfToken(req: Request, res: Response, next: NextFunction) {
  let csrfToken = req.cookies.csrfToken;

  if (!isValidCsrfToken(csrfToken)) {
    csrfToken = createCsrfToken();
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
