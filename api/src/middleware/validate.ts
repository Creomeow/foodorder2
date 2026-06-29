import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type infer as ZInfer } from 'zod';
import { badRequest } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/** Validate a request part against a Zod schema, replacing it with the parsed value. */
export function validate<S extends ZodTypeAny>(schema: S, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // query/params are read-only getters in Express 5; assign defensively.
      (req as unknown as Record<string, unknown>)[`valid${source[0].toUpperCase()}${source.slice(1)}`] =
        parsed;
      if (source === 'body') req.body = parsed;
      else (req as unknown as Record<string, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(badRequest('Validation failed', err.flatten()));
      } else {
        next(err);
      }
    }
  };
}

// Helper to read a typed validated payload back out (the parsed body/query/params).
export type Validated<S extends ZodTypeAny> = ZInfer<S>;
