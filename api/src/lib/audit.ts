import { Prisma } from '@prisma/client';
import type { JwtPayload } from './jwt.js';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

/** Record a mutation in the audit log. Never throws (best-effort). */
export async function audit(
  user: JwtPayload | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: user?.sub ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'audit log write failed');
  }
}
