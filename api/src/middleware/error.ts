import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ error: err.code, message: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'CONFLICT', message: 'A record with that value already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
    }
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
}
