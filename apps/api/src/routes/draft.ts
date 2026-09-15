import type { FastifyInstance } from 'fastify';
import { generateDraft, type DraftBox } from '../ai/draft.js';

const VALID_BOXES: DraftBox[] = ['procedural_matters', 'facts_found', 'conclusion', 'decision'];

// Phase 4 (CONTEXT.md section 9) — the only route in the app that calls
// out to the network. Never writes to the case; the drafter reads the
// suggestion and inserts it manually, same as the phrase library (D-022).
export function registerDraftRoute(app: FastifyInstance) {
  app.post('/cases/:id/draft', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { box, currentText } = req.body as { box?: string; currentText?: string };
    if (!box || !VALID_BOXES.includes(box as DraftBox)) {
      return reply.code(400).send({ error: `box must be one of ${VALID_BOXES.join(', ')}` });
    }

    try {
      const result = await generateDraft(Number(id), box as DraftBox, currentText ?? '');
      return result;
    } catch (e) {
      const message = (e as Error).message;
      const code = message === 'case not found' ? 404 : 502;
      return reply.code(code).send({ error: message });
    }
  });
}
