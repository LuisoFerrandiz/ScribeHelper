import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { fillGaps, readGaps } from '../ai/fillGaps.js';

// SPEC-031: proposals for the data gaps of a phrase. Never writes to the case:
// the scribe accepts each value in the UI.
export function registerFillGapsRoute(app: FastifyInstance) {
  app.post('/cases/:id/fill-gaps', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { gaps?: unknown; notes?: unknown; facts_found?: unknown };
    if (!db.prepare('SELECT 1 FROM protest_case WHERE id = ?').get(id)) {
      return reply.code(404).send({ error: 'not found' });
    }
    const gaps = readGaps(body.gaps);
    if (!gaps) return reply.code(400).send({ error: 'gaps must be a non-empty list of data gaps' });
    try {
      return await fillGaps(
        Number(id),
        gaps,
        typeof body.notes === 'string' ? body.notes : '',
        typeof body.facts_found === 'string' ? body.facts_found : '',
      );
    } catch (e) {
      return reply.code(502).send({ error: (e as Error).message });
    }
  });
}
