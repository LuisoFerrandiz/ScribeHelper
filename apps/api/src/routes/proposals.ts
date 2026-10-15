import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { MAX_CANDIDATES, PROPOSAL_BOXES, generateProposals } from '../ai/proposals.js';
import type { ProposalBox } from '../ai/proposals.js';

// SPEC-034: live proposals for a writing box. Never writes to the case: the
// scribe inserts a proposal with one click. A failing model is not an error
// (ai: 'failed' / 'unavailable'): the client keeps its own phrase ranking.
export function registerProposalsRoute(app: FastifyInstance) {
  app.post('/cases/:id/proposals', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as {
      box?: unknown;
      text?: unknown;
      notes?: unknown;
      context?: unknown;
      candidate_ids?: unknown;
    };
    if (!db.prepare('SELECT 1 FROM protest_case WHERE id = ?').get(id)) {
      return reply.code(404).send({ error: 'not found' });
    }
    if (typeof body.box !== 'string' || !PROPOSAL_BOXES.includes(body.box as ProposalBox)) {
      return reply.code(400).send({ error: `box must be one of ${PROPOSAL_BOXES.join(', ')}` });
    }
    if (typeof body.text !== 'string') return reply.code(400).send({ error: 'text is required' });
    const candidateIds = Array.isArray(body.candidate_ids)
      ? body.candidate_ids.filter((n): n is number => typeof n === 'number' && Number.isInteger(n)).slice(0, MAX_CANDIDATES)
      : [];
    return generateProposals({
      caseId: Number(id),
      box: body.box as ProposalBox,
      text: body.text,
      notes: typeof body.notes === 'string' ? body.notes : '',
      context: body.context,
      candidateIds,
    });
  });
}
