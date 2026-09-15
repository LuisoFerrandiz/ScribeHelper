import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_COOKIE, verifySession, type SessionUser } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: SessionUser | null;
  }
}

// Every route requires a logged-in session except this short list
// (D-026) — a global hook, not a per-route preHandler, so a new route
// added later is protected by default instead of by remembering to
// guard it.
const PUBLIC_PATHS = new Set(['/health', '/auth/login']);

export function registerAuthGuard(app: FastifyInstance) {
  app.decorateRequest('currentUser', null);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'OPTIONS') return;

    const path = request.url.split('?')[0];
    if (PUBLIC_PATHS.has(path)) return;

    const user = verifySession(request.cookies[SESSION_COOKIE]);
    if (!user) {
      reply.code(401).send({ error: 'not authenticated' });
      return;
    }
    request.currentUser = user;
  });
}

// Extra check for the user-management routes only (D-026: a single
// admin, only they can create/list/remove accounts).
export function requireAdmin(request: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) {
  if (request.currentUser?.role !== 'admin') {
    reply.code(403).send({ error: 'admin only' });
    return;
  }
  done();
}
