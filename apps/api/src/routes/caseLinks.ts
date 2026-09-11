import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

// case_link has a composite primary key (case_id, linked_case_id), no
// surrogate id — it does not fit registerCrud, so it gets its own routes.
// Links are symmetric (CONTEXT.md section 4 "With Case(s)"): writing or
// deleting one link writes or deletes both directions.
export function registerCaseLinkRoutes(app: FastifyInstance) {
  app.get('/case-links', () => {
    return db.prepare('SELECT * FROM case_link ORDER BY case_id').all();
  });

  app.post('/case-links', (req, reply) => {
    const { case_id, linked_case_id } = req.body as { case_id: number; linked_case_id: number };
    if (!case_id || !linked_case_id || case_id === linked_case_id) {
      return reply.code(400).send({ error: 'case_id and linked_case_id are required and must differ' });
    }
    const insert = db.prepare(
      'INSERT OR IGNORE INTO case_link (case_id, linked_case_id) VALUES (?, ?)',
    );
    insert.run(case_id, linked_case_id);
    insert.run(linked_case_id, case_id);
    reply.code(201).send({ case_id, linked_case_id });
  });

  app.delete('/case-links', (req, reply) => {
    const { case_id, linked_case_id } = req.body as { case_id: number; linked_case_id: number };
    const del = db.prepare('DELETE FROM case_link WHERE case_id = ? AND linked_case_id = ?');
    del.run(case_id, linked_case_id);
    del.run(linked_case_id, case_id);
    reply.code(204).send();
  });
}
