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
    const result = stmt.run(...cols.map((c) => body[c] as never));

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
    db.prepare(`UPDATE ${table} SET ${setClause}${extra} WHERE id = ?`).run(
      ...cols.map((c) => body[c] as never),
      id,
    );

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
