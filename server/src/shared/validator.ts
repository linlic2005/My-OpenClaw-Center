import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors.js';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      // Replace with parsed (coerced/defaulted) data
      if (source === 'body') req.body = data;
      else if (source === 'query') (req as any).query = data;
      else (req as any).params = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError(err.flatten()));
      } else {
        next(err);
      }
    }
  };
}
