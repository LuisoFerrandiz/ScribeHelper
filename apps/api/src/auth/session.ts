import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config.js';

export interface SessionUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

declare module '@fastify/secure-session' {
  interface SessionData {
    user: SessionUser;
  }
}

// @fastify/secure-session needs a 32-byte key. Any SESSION_SECRET string
// works — it's hashed down to the right length, not used raw — so
// deployment only has to set one env var, same pattern as
// ANTHROPIC_API_KEY. No secret set falls back to a random key generated
// at process start: every existing session is invalidated on restart
// instead of the app silently running with a known, empty key.
export function getSessionKey(): Buffer {
  if (!config.sessionSecret) {
    console.warn('SESSION_SECRET not set — using a random key for this run (logs everyone out on restart).');
    return randomBytes(32);
  }
  return createHash('sha256').update(config.sessionSecret).digest();
}
