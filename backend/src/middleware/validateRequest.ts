import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export const validateRequest = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const e of error.issues) {
          const path = e.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(e.message);
        }
        
        return next(new ValidationError('Validation Error', details));
      }
      next(error);
    }
  };
};
