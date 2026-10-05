import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

interface CrudOptions {
  table: string;
  fields: string[]; // insertable/updatable columns, excluding id
  touchUpdatedAt?: boolean; // set updated_at = now() on update
}

// Same CRUD shape for every entity in RULES.md/CONTEXT.md: person, event,
// boat, and the case-scoped tables. One generic handler instead of eight
// near-identical route files.
export function registerCrud(app: FastifyInstance, prefix: string, opts: CrudOptions) {
  const { table, fields, touchUpdatedAt } = opts;

  app.get(`/${prefix}`, () => {
    return db.prepare(`SELECT * FROM ${table} ORDER BY id`).all();
  });

  app.get(`/${prefix}/:id`, (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) return reply.code(404).send({ error: 'not found' });
    return row;
  });

  app.post(`/${prefix}`, (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const cols = fields.filter((f) => f in body);
    if (cols.length === 0) return reply.code(400).send({ error: 'no valid fields' });

    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);

    let result;
    try {
      result = stmt.run(...cols.map((c) => body[c] as never));
    } catch (e) {
      // SPEC-002 RF-005: a duplicate case_number within the same event_id
      // (protest_case's UNIQUE(event_id, case_number)) is the first real
      // UNIQUE violation this generic handler can hit — caught here so it
      // protects every entity using registerCrud, not just cases.
      if ((e as Error).message.includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ error: 'duplicate' });
      }
      throw e;
    }

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
    reply.code(201).send(row);
  });

  app.put(`/${prefix}/:id`, (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const cols = fields.filter((f) => f in body);
    if (cols.length === 0) return reply.code(400).send({ error: 'no valid fields' });

    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const extra = touchUpdatedAt ? `, updated_at = datetime('now')` : '';
    try {
      db.prepare(`UPDATE ${table} SET ${setClause}${extra} WHERE id = ?`).run(
        ...cols.map((c) => body[c] as never),
        id,
      );
    } catch (e) {
      // Same UNIQUE guard as the POST handler above — case_jury_member's
      // UNIQUE(case_id, person_id) is reachable via PUT too (changing an
      // occupied slot to an already-assigned judge, SPEC-009 RF-008).
      if ((e as Error).message.includes('UNIQUE constraint failed')) {
        return reply.code(409).send({ error: 'duplicate' });
      }
      throw e;
    }

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) return reply.code(404).send({ error: 'not found' });
    return row;
  });

  app.delete(`/${prefix}/:id`, (req, reply) => {
    const { id } = req.params as { id: string };
    const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    if (result.changes === 0) return reply.code(404).send({ error: 'not found' });
    reply.code(204).send();
  });
}
