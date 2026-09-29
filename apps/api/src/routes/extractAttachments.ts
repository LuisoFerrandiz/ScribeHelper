import type { FastifyInstance } from 'fastify';
import { extractFromAttachments } from '../ai/extract.js';

// Manual "Process" trigger (DECISIONS.md D-027 follow-up) — reads this
// case's uploaded protest form(s) and returns candidate suggestions for
// every box. Never writes to the case; the drafter reviews and inserts
// each piece manually, same as the AI draft panel (D-024) and phrase
// library (D-022).
export function registerExtractAttachmentsRoute(app: FastifyInstance) {
  app.post('/cases/:id/extract-attachments', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return await extractFromAttachments(Number(id));
    } catch (e) {
      const message = (e as Error).message;
      const code = message.includes('no processable attachments') ? 400 : 502;
      return reply.code(code).send({ error: message });
    }
  });
}
