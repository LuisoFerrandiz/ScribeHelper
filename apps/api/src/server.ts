import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import secureSession from '@fastify/secure-session';
import { config } from './config.js';
import { registerRoutes } from './routes/index.js';
import { registerAuthGuard } from './auth/guard.js';
import { getSessionKey } from './auth/session.js';

const app = Fastify({ logger: true });

// No AI, no external network calls in this phase (RULES.md R-23, R-34).
// This server exists so the model API key never reaches the browser
// (RULES.md R-18) — the boundary is built now, used from Phase 4 on.
// credentials: true (plus origin echoed, not '*') so the session cookie
// (Phase 5.5, D-026) survives the web app and API being on different
// ports/origins.
await app.register(cors, { origin: true, credentials: true });

await app.register(secureSession, {
  key: getSessionKey(),
  cookieName: 'scribe_session',
  cookie: { path: '/', httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60 * 24 * 30 },
});

registerAuthGuard(app);

// Phase 3 resource uploads (rules/examples originals) — 50MB covers a
// full RRS rulebook PDF with margin; scanned-image PDFs are out of scope
// (D-010, no OCR) so they should never be this large in practice.
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/health', () => ({ status: 'ok' }));

registerRoutes(app);

app.listen({ host: config.host, port: config.port }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
