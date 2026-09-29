import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { deleteAttachmentFiles, storeAttachment } from '../case-attachments/storage.js';

interface CaseAttachmentRow {
  id: number;
  case_id: number;
  original_filename: string;
  original_path: string;
  markdown_path: string | null;
  conversion_empty: 0 | 1;
  uploaded_at: string;
}

// Files uploaded against one case (protest forms, for now — CONTEXT.md
// section 6, DECISIONS.md D-027). Deliberately not the resources.ts
// pipeline: no kind/layer/scope, no review gate, no FTS indexing.
export function registerCaseAttachmentRoutes(app: FastifyInstance) {
  app.get('/cases/:caseId/attachments', (req) => {
    const { caseId } = req.params as { caseId: string };
    return db
      .prepare(
        `SELECT id, original_filename, conversion_empty, uploaded_at
         FROM case_attachment WHERE case_id = ? ORDER BY uploaded_at`,
      )
      .all(caseId);
  });

  app.post('/cases/:caseId/attachments', async (req, reply) => {
    const { caseId } = req.params as { caseId: string };
    if (!req.isMultipart()) return reply.code(400).send({ error: 'expected multipart/form-data' });

    const parts = req.parts();
    let fileBuffer: Buffer | null = null;
    let originalFilename = '';
    for await (const part of parts) {
      if (part.type === 'file') {
        originalFilename = part.filename;
        fileBuffer = await part.toBuffer();
      }
    }
    if (!fileBuffer) return reply.code(400).send({ error: 'no file uploaded' });

    const stored = await storeAttachment(originalFilename, fileBuffer);

    const result = db
      .prepare(
        `INSERT INTO case_attachment (case_id, original_filename, original_path, markdown_path, conversion_empty)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(caseId, originalFilename, stored.originalPath, stored.markdownPath, stored.conversionEmpty ? 1 : 0);

    const row = db
      .prepare(
        'SELECT id, original_filename, conversion_empty, uploaded_at FROM case_attachment WHERE id = ?',
      )
      .get(result.lastInsertRowid);
    reply.code(201).send(row);
  });

  app.get('/attachments/:id/file', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM case_attachment WHERE id = ?').get(id) as
      | CaseAttachmentRow
      | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });

    const buffer = await readFile(path.join(config.dataDir, row.original_path));
    reply
      .header('Content-Disposition', `attachment; filename="${row.original_filename.replace(/"/g, '')}"`)
      .type('application/octet-stream')
      .send(buffer);
  });

  app.delete('/attachments/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM case_attachment WHERE id = ?').get(id) as
      | CaseAttachmentRow
      | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });

    await deleteAttachmentFiles({ originalPath: row.original_path, markdownPath: row.markdown_path });
    db.prepare('DELETE FROM case_attachment WHERE id = ?').run(id);
    reply.code(204).send();
  });
}
