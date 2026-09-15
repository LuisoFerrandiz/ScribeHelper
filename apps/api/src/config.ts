import 'dotenv/config';

// All configuration through environment variables (RULES.md R-16).
export const config = {
  host: process.env.HOST ?? '0.0.0.0', // RULES.md R-19: never localhost
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? './data', // RULES.md R-13, R-15: relative
  timezone: process.env.TZ ?? 'UTC', // RULES.md R-20
  // Phase 5.5 (D-026): any string works — it's hashed to a fixed-length
  // key (src/auth/session.ts), not used raw. Falls back to a random key
  // so a missing/forgotten secret fails safe (every session invalidated
  // on restart) instead of running with a known, empty key.
  sessionSecret: process.env.SESSION_SECRET ?? '',
};
