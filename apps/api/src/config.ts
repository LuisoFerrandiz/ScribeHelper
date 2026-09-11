import 'dotenv/config';

// All configuration through environment variables (RULES.md R-16).
export const config = {
  host: process.env.HOST ?? '0.0.0.0', // RULES.md R-19: never localhost
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? './data', // RULES.md R-13, R-15: relative
  timezone: process.env.TZ ?? 'UTC', // RULES.md R-20
};
