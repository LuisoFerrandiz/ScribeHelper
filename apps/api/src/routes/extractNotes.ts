import type { FastifyInstance } from 'fastify';
import { extractFromNotes } from '../ai/extractNotes.js';

// Manual "Process" trigger (also fired automatically from the frontend
// on tab-switch into a writing box, SPEC-017 RF-004) — same shape as
// extract-attachments: never writes to the case, the scribe reviews
// and inserts each piece manually.
export function registerExtractNotesRoute(app: FastifyInstance) {
  app.post('/cases/:id/extract-notes', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { notes } = req.body as { notes?: string };
    try {
      return await extractFromNotes(Number(id), notes ?? '');
    } catch (e) {
      const message = (e as Error).message;
      const code = message.includes('no notes to process') ? 400 : 502;
      return reply.code(code).send({ error: message });
    }
  });
}
