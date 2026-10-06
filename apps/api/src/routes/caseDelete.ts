import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { requireAdmin } from '../auth/guard.js';
import { deleteAttachmentFiles } from '../case-attachments/storage.js';

interface CaseAttachmentFileRow {
  original_path: string;
  markdown_path: string | null;
}

// Deleting a case cascades every DB row via schema.sql's ON DELETE
// CASCADE (party/witness/case_rule_citation/case_jury_member/case_link/
// case_attachment) — but a cascade never touches files on disk. This
// route cleans up each attachment's files first, same helper the
// single-attachment DELETE route already uses (D-027), then deletes the
// case row itself. Admin-only (D-026), same guard as /users/:id.
export function registerCaseDeleteRoute(app: FastifyInstance) {
  app.delete('/cases/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT id FROM protest_case WHERE id = ?').get(id);
    if (!row) return reply.code(404).send({ error: 'not found' });

    const attachments = db
      .prepare('SELECT original_path, markdown_path FROM case_attachment WHERE case_id = ?')
      .all(id) as unknown as CaseAttachmentFileRow[];
    for (const a of attachments) {
      await deleteAttachmentFiles({ originalPath: a.original_path, markdownPath: a.markdown_path });
    }

    db.prepare('DELETE FROM protest_case WHERE id = ?').run(id);
    reply.code(204).send();
  });
}
