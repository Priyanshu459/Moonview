import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Forbidden: Admin access required'));
  }
  next();
};
