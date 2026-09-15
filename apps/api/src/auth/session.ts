import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

export interface SessionUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export const SESSION_COOKIE = 'scribe_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// A signed (not encrypted) cookie: "<base64url payload>.<hmac-sha256 hex>".
// No native dependency — @fastify/secure-session pulls in sodium-native,
// whose prebuilt binary doesn't match this image's musl libc
// (node:24-alpine) and crash-looped the API container in production
// (2026-09-15 incident, see D-026 follow-up). HMAC via node:crypto has
// no such problem and no extra dependency at all. The payload here is
// only {id, username, role} — nothing secret — so signed-but-readable
// is an acceptable trade for "the client can't forge or alter it".
//
// Resolved once at process start, not per call: a per-call random
// fallback would sign with a different key every time and never
// verify. Missing SESSION_SECRET still fails safe (every session
// invalidated on restart) instead of signing with a known, empty key.
const sessionKey: Buffer = config.sessionSecret
  ? createHash('sha256').update(config.sessionSecret).digest()
  : (() => {
      console.warn('SESSION_SECRET not set — using a random key for this run (logs everyone out on restart).');
      return randomBytes(32);
    })();

export function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  const mac = createHmac('sha256', sessionKey).update(payload).digest('hex');
  return `${payload}.${mac}`;
}

export function verifySession(cookieValue: string | undefined): SessionUser | null {
  if (!cookieValue) return null;
  const [payload, mac] = cookieValue.split('.');
  if (!payload || !mac) return null;

  const expectedMac = createHmac('sha256', sessionKey).update(payload).digest('hex');
  const macBuf = Buffer.from(mac, 'hex');
  const expectedBuf = Buffer.from(expectedMac, 'hex');
  if (macBuf.length !== expectedBuf.length || !timingSafeEqual(macBuf, expectedBuf)) return null;

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as SessionUser;
  } catch {
    return null;
  }
}
