import type { FastifyInstance } from 'fastify';
import { suggestPhrasesFromExamples, type ExampleSuggestionBox } from '../ai/exampleSuggestions.js';

const VALID_BOXES: ExampleSuggestionBox[] = ['procedural_matters', 'facts_found'];

// SPEC-005/SPEC-006 — not case-scoped, reads the examples/ corpus as a
// whole, same "no network outside this app" exception as draft.ts/
// complete.ts.
export function registerExampleSuggestionsRoute(app: FastifyInstance) {
  app.get('/ai/example-suggestions/:box', async (req, reply) => {
    const { box } = req.params as { box: string };
    if (!VALID_BOXES.includes(box as ExampleSuggestionBox)) {
      return reply.code(400).send({ error: `box must be one of ${VALID_BOXES.join(', ')}` });
    }

    try {
      const phrases = await suggestPhrasesFromExamples(box as ExampleSuggestionBox);
      return { phrases };
    } catch (e) {
      return reply.code(502).send({ error: (e as Error).message });
    }
  });
}
