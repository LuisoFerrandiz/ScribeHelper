import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

interface PhraseRow {
  id: number;
  box: string;
  label: string;
  body: string;
  origin: 'base' | 'own';
  created_at: string;
}

// Phase 2 phrase library (CONTEXT.md section 6, D-022). base phrases come
// from the seeded spreadsheet and are never editable/deletable, same
// base/own split as example resources (D-007).
export function registerPhraseRoutes(app: FastifyInstance) {
  app.get('/phrases', (req) => {
    const { box } = req.query as { box?: string };
    if (box) {
      return db.prepare('SELECT * FROM phrase WHERE box = ? ORDER BY origin, label').all(box);
    }
    return db.prepare('SELECT * FROM phrase ORDER BY box, origin, label').all();
  });

  app.get('/phrases/search', (req) => {
    const { q, box } = req.query as { q?: string; box?: string };
    if (!q?.trim()) return [];
    const rows = db
      .prepare(
        `SELECT p.id, p.box, p.label, p.body, p.origin,
                snippet(phrase_fts, 1, '[', ']', '…', 12) AS snippet
         FROM phrase_fts
         JOIN phrase p ON p.id = phrase_fts.phrase_id
         WHERE phrase_fts MATCH ?
         ORDER BY rank
         LIMIT 25`,
      )
      .all(q.trim()) as unknown as (PhraseRow & { snippet: string })[];
    return box ? rows.filter((r) => r.box === box) : rows;
  });

  app.post('/phrases', (req, reply) => {
    const body = req.body as Partial<PhraseRow>;
    if (!body.box || !body.body?.trim()) {
      return reply.code(400).send({ error: 'box and body are required' });
    }
    const result = db
      .prepare("INSERT INTO phrase (box, label, body, origin) VALUES (?, ?, ?, 'own')")
      .run(body.box, body.label?.trim() ?? '', body.body.trim());
    const row = db.prepare('SELECT * FROM phrase WHERE id = ?').get(result.lastInsertRowid) as unknown as PhraseRow;
    db.prepare('INSERT INTO phrase_fts (label, body, phrase_id) VALUES (?, ?, ?)').run(
      row.label,
      row.body,
      row.id,
    );
    reply.code(201).send(row);
  });

  app.delete('/phrases/:id', (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM phrase WHERE id = ?').get(id) as PhraseRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });
    if (row.origin === 'base') return reply.code(403).send({ error: 'base phrases cannot be deleted' });

    db.prepare('DELETE FROM phrase_fts WHERE phrase_id = ?').run(id);
    db.prepare('DELETE FROM phrase WHERE id = ?').run(id);
    reply.code(204).send();
  });
}
