import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../auth/guard.js';
import { db } from '../db/connection.js';
import { convertToMarkdown } from '../resources/convert.js';
import { deleteStoredFiles, moveMarkdown, readMarkdown, storeUpload } from '../resources/storage.js';
import type { ExampleScope, ResourceKind, RuleLayer } from '../resources/storage.js';
import { deleteSectionsSync, indexResourceSections } from '../resources/sectionIndex.js';
import { parseRuleSections } from '../resources/ruleSections.js';
import { citationFor, prefixFor } from '../rules/citation.js';
import type { DocType } from '../rules/citation.js';

const DOC_TYPES: DocType[] = ['nor', 'si', 'si_amendment'];
const isDocType = (v: unknown): v is DocType => DOC_TYPES.includes(v as DocType);

interface ResourceRow {
  id: number;
  kind: ResourceKind;
  layer: RuleLayer | null;
  event_id: number | null;
  scope: ExampleScope | null;
  title: string;
  original_filename: string;
  original_path: string;
  markdown_path: string | null;
  status: 'pending_review' | 'accepted';
  conversion_empty: 0 | 1;
  created_at: string;
  reviewed_at: string | null;
  doc_type: DocType | null;
  sections_indexed_at: string | null;
}

// Upload/review pipeline for rules and examples (CONTEXT.md sections 6-7,
// DECISIONS.md D-009, D-018-followup). Shared flow for both kinds; kind
// determines where the converted file lands (resources/storage.ts) and
// whether it gets indexed for the rule picker (resource_fts, rules only).
export function registerResourceRoutes(app: FastifyInstance) {
  app.get('/resources', (req) => {
    const { kind, status } = req.query as { kind?: string; status?: string };
    const clauses: string[] = [];
    const params: string[] = [];
    if (kind) {
      clauses.push('kind = ?');
      params.push(kind);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return db.prepare(`SELECT * FROM resource ${where} ORDER BY created_at DESC`).all(...params);
  });

  app.get('/resources/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM resource WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });
    const markdown = row.markdown_path ? await readMarkdown(row.markdown_path) : '';
    return { ...row, markdown, sectionsPreview: row.kind === 'rule' ? sectionsPreview(row, markdown) : null };
  });

  app.post('/resources', { preHandler: requireAdmin }, async (req, reply) => {
    if (!req.isMultipart()) return reply.code(400).send({ error: 'expected multipart/form-data' });

    const parts = req.parts();
    let fileBuffer: Buffer | null = null;
    let originalFilename = '';
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        originalFilename = part.filename;
        fileBuffer = await part.toBuffer();
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }

    if (!fileBuffer) return reply.code(400).send({ error: 'no file uploaded' });

    const kind = fields.kind as ResourceKind;
    if (kind !== 'rule' && kind !== 'example') {
      return reply.code(400).send({ error: "kind must be 'rule' or 'example'" });
    }
    const title = fields.title?.trim();
    if (!title) return reply.code(400).send({ error: 'title is required' });

    const layer = kind === 'rule' ? (fields.layer as RuleLayer) : null;
    const scope = kind === 'example' ? (fields.scope as ExampleScope) : null;
    const eventId = fields.event_id ? Number(fields.event_id) : null;

    if (kind === 'rule' && !layer) return reply.code(400).send({ error: 'layer is required for rules' });
    if (kind === 'rule' && layer === 'event' && !eventId) {
      return reply.code(400).send({ error: 'event_id is required for event-layer rules' });
    }
    if (kind === 'example' && !scope) return reply.code(400).send({ error: 'scope is required for examples' });
    // SPEC-022 RF-001: an event document must say what it is (NoR / SI / SI amendment).
    const docType = kind === 'rule' && layer === 'event' ? fields.doc_type : null;
    if (kind === 'rule' && layer === 'event' && !isDocType(docType)) {
      return reply.code(400).send({ error: 'doc_type (nor, si or si_amendment) is required for event-layer rules' });
    }

    let conversion;
    try {
      conversion = await convertToMarkdown(fileBuffer, originalFilename);
    } catch (e) {
      return reply.code(422).send({ error: `conversion failed: ${(e as Error).message}` });
    }

    const stored = await storeUpload(kind, (layer ?? scope)!, originalFilename, fileBuffer, conversion.markdown);

    const result = db
      .prepare(
        `INSERT INTO resource (kind, layer, event_id, scope, title, original_filename, original_path, markdown_path, conversion_empty, doc_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        kind,
        layer,
        eventId,
        scope,
        title,
        originalFilename,
        stored.originalPath,
        stored.markdownPath,
        conversion.empty ? 1 : 0,
        docType,
      );

    const row = db.prepare('SELECT * FROM resource WHERE id = ?').get(result.lastInsertRowid) as unknown as ResourceRow;
    reply.code(201).send({ ...row, markdown: conversion.markdown });
  });

  app.post('/resources/:id/accept', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM resource WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });

    db.prepare(`UPDATE resource SET status = 'accepted', reviewed_at = datetime('now') WHERE id = ?`).run(id);

    if (row.kind === 'rule' && row.markdown_path) {
      // Index for the rule picker/search (D-011). Examples are never
      // cited, so they are never indexed here. Awaited so the FTS row
      // exists by the time this response is sent — a caller searching
      // right after accept must find it.
      const body = await readMarkdown(row.markdown_path);
      db.prepare('INSERT INTO resource_fts (title, body, resource_id) VALUES (?, ?, ?)').run(
        row.title,
        body,
        row.id,
      );
      // SPEC-022: per-rule index, so the accepted document can be cited by number.
      await indexResourceSections(row.id);
    }

    const updated = db.prepare('SELECT * FROM resource WHERE id = ?').get(id);
    return updated;
  });

  app.post('/resources/:id/reject', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM resource WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });

    await deleteStoredFiles({ originalPath: row.original_path, markdownPath: row.markdown_path });
    deleteSectionsSync(Number(id));
    db.prepare('DELETE FROM resource WHERE id = ?').run(id);
    reply.code(204).send();
  });

  // Delete an already-accepted resource (own examples, event-layer rules
  // at the end of a regatta, etc.) — same cleanup as reject.
  app.delete('/resources/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM resource WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });

    await deleteStoredFiles({ originalPath: row.original_path, markdownPath: row.markdown_path });
    // FTS5 UNINDEXED columns don't get SQLite's usual type-affinity
    // coercion — a string '1' never matches a stored integer 1, so this
    // must be Number(id), not the raw string from req.params.
    db.prepare('DELETE FROM resource_fts WHERE resource_id = ?').run(Number(id));
    deleteSectionsSync(Number(id));
    db.prepare('DELETE FROM resource WHERE id = ?').run(id);
    reply.code(204).send();
  });

  // Fixes a wrong kind/layer/scope pick at upload time (moves the file,
  // updates the row, re-syncs resource_fts — only kind = 'rule' rows are
  // indexed, D-020) without having to re-upload and re-convert.
  app.post('/resources/:id/reclassify', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM resource WHERE id = ?').get(id) as ResourceRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });
    if (!row.markdown_path) return reply.code(409).send({ error: 'not converted yet' });

    const body = req.body as { kind: ResourceKind; layer?: RuleLayer; scope?: ExampleScope; event_id?: number; doc_type?: string };
    const kind = body.kind;
    const layer = kind === 'rule' ? (body.layer ?? 'rrs') : null;
    const scope = kind === 'example' ? (body.scope ?? 'own') : null;
    const eventId = kind === 'rule' && layer === 'event' ? (body.event_id ?? row.event_id) : null;
    if (kind === 'rule' && layer === 'event' && !eventId) {
      return reply.code(400).send({ error: 'event_id is required for event-layer rules' });
    }
    // SPEC-022 RF-001: doc_type only exists on event rules; leaving event clears it.
    const docType = kind === 'rule' && layer === 'event' ? (body.doc_type ?? row.doc_type) : null;
    if (kind === 'rule' && layer === 'event' && !isDocType(docType)) {
      return reply.code(400).send({ error: 'doc_type (nor, si or si_amendment) is required for event-layer rules' });
    }

    const newMarkdownPath = await moveMarkdown(row.markdown_path, kind, (layer ?? scope)!);

    db.prepare(
      'UPDATE resource SET kind = ?, layer = ?, scope = ?, event_id = ?, doc_type = ?, markdown_path = ? WHERE id = ?',
    ).run(kind, layer, scope, eventId, docType, newMarkdownPath, id);

    // Re-sync the FTS index: only accepted rules are searchable (D-020).
    db.prepare('DELETE FROM resource_fts WHERE resource_id = ?').run(Number(id));
    if (kind === 'rule' && row.status === 'accepted') {
      const bodyText = await readMarkdown(newMarkdownPath);
      db.prepare('INSERT INTO resource_fts (title, body, resource_id) VALUES (?, ?, ?)').run(
        row.title,
        bodyText,
        Number(id),
      );
    }
    // SPEC-022: rebuild the per-rule index from the (possibly moved) .md; examples have none.
    deleteSectionsSync(Number(id));
    if (kind === 'rule' && row.status === 'accepted') await indexResourceSections(Number(id));

    const updated = db.prepare('SELECT * FROM resource WHERE id = ?').get(id);
    return updated;
  });

  app.get('/resources/search', (req) => {
    const { q } = req.query as { q?: string };
    if (!q?.trim()) return [];
    return db
      .prepare(
        `SELECT r.id, r.title, r.layer, snippet(resource_fts, 1, '[', ']', '…', 10) AS snippet
         FROM resource_fts
         JOIN resource r ON r.id = resource_fts.resource_id
         WHERE resource_fts MATCH ?
         ORDER BY rank`,
      )
      .all(q.trim());
  });
}

// RF-013: what the parser finds in a document, computed in memory (nothing is
// written) so the review screen can say "N rules detected".
function sectionsPreview(row: ResourceRow, markdown: string) {
  const sections = parseRuleSections(markdown);
  const prefix = row.layer ? prefixFor(row.layer, row.doc_type) : null;
  const cites = sections.map((x) => citationFor({ prefix, number: x.number, part: x.part }));
  return { count: sections.length, sample: [...cites.slice(0, 5), ...cites.slice(-5)].filter((c, i, a) => a.indexOf(c) === i) };
}
