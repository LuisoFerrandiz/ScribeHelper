import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Reads the repository's single .env (RULES.md R-16: one source of
// configuration, nothing hardcoded), instead of a second .env under
// apps/web.
export default defineConfig(() => {
  const port = Number(process.env.WEB_PORT ?? 5173);
  return {
    plugins: [react()],
    envDir: '../../',
    server: { port },
  };
});
