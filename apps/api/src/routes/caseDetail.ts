import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

// Read-only convenience endpoint: one case with everything the case form
// needs in a single request (event, parties, witnesses, jury, rule
// citations, linked cases). Still plain CRUD data underneath — no AI,
// no computation beyond joins.
export function registerCaseDetailRoute(app: FastifyInstance) {
  app.get('/cases/:id/full', (req, reply) => {
    const { id } = req.params as { id: string };

    const caseRow = db.prepare('SELECT * FROM protest_case WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!caseRow) return reply.code(404).send({ error: 'not found' });
    const eventId = caseRow.event_id as number;

    const event = db.prepare('SELECT * FROM event WHERE id = ?').get(eventId);
    // Panel sitting on THIS case (D-021) — not the event's whole judge pool.
    const jury = db
      .prepare(
        `SELECT case_jury_member.id, case_jury_member.is_chairman, person.full_name
         FROM case_jury_member JOIN person ON person.id = case_jury_member.person_id
         WHERE case_jury_member.case_id = ?`,
      )
      .all(id);

    const parties = db
      .prepare(
        `SELECT party.id, party.role, boat.sail_number, boat.boat_name, person.full_name AS represented_by
         FROM party
         LEFT JOIN boat ON boat.id = party.boat_id
         LEFT JOIN person ON person.id = party.represented_by_id
         WHERE party.case_id = ?`,
      )
      .all(id);

    const witnesses = db
      .prepare(
        `SELECT witness.id, witness.role, person.full_name
         FROM witness JOIN person ON person.id = witness.person_id
         WHERE witness.case_id = ?`,
      )
      .all(id);

    const ruleCitations = db
      .prepare('SELECT id, rule_reference, position FROM case_rule_citation WHERE case_id = ? ORDER BY position')
      .all(id);

    const linkedCases = db
      .prepare(
        `SELECT protest_case.id, protest_case.case_number
         FROM case_link JOIN protest_case ON protest_case.id = case_link.linked_case_id
         WHERE case_link.case_id = ?`,
      )
      .all(id);

    return { ...caseRow, event, jury, parties, witnesses, ruleCitations, linkedCases };
  });
}
