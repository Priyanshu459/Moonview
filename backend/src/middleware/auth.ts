import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { UnauthorizedError } from '../utils/errors.js';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.signedCookies.token;

    if (!token) {
      throw new UnauthorizedError('Unauthorized');
    }

    try {
      const user = await authService.verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      throw new UnauthorizedError('Unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

export const authenticateTokenOptional = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.signedCookies.token;
    if (token) {
      try {
        const user = await authService.verifyToken(token);
        req.user = user;
      } catch (error) {
        // Ignore errors for optional token
      }
    }
    next();
  } catch (error) {
    next();
  }
};
