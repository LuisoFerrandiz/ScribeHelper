import type { FastifyInstance } from 'fastify';
import { generateInlineCompletion } from '../ai/complete.js';
import type { CompleteBox } from '../ai/complete.js';

const VALID_BOXES: CompleteBox[] = ['procedural_matters', 'facts_found', 'conclusion', 'rules_applicable', 'decision'];

// Phase 5 (CONTEXT.md section 9) — inline ghost-text completion (D-025).
// Same network exception as /cases/:id/draft (D-024), but fired
// automatically on a typing pause, so kept as a separate, cheaper route
// rather than reusing the draft endpoint.
export function registerCompleteRoute(app: FastifyInstance) {
  app.post('/cases/:id/complete', async (req, reply) => {
    const { box, text } = req.body as { box?: string; text?: string };
    if (!box || !VALID_BOXES.includes(box as CompleteBox)) {
      return reply.code(400).send({ error: `box must be one of ${VALID_BOXES.join(', ')}` });
    }
    if (typeof text !== 'string') return reply.code(400).send({ error: 'text is required' });

    try {
      const suggestion = await generateInlineCompletion(box as CompleteBox, text);
      return { suggestion };
    } catch (e) {
      return reply.code(502).send({ error: (e as Error).message });
    }
  });
}
