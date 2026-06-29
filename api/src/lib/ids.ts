import { randomBytes, randomUUID } from 'node:crypto';

/** URL-safe opaque token for QR codes / sessions. */
export function token(bytes = 16): string {
  return randomBytes(bytes).toString('base64url');
}

export { randomUUID };
