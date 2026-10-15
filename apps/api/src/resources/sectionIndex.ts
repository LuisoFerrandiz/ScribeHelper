import { db } from '../db/connection.js';
import { inTransaction } from '../db/transaction.js';
import { readMarkdown } from './storage.js';
import { parseRuleSections, RULE_PARSER_VERSION } from './ruleSections.js';

// SPEC-022 RF-002/RF-014: per-rule index of an accepted rule document.

function clearSections(resourceId: number): void {
  // section_id is an UNINDEXED FTS column: ids must be integers (D-023).
  const ids = db.prepare('SELECT id FROM rule_section WHERE resource_id = ?').all(resourceId) as { id: number }[];
  const del = db.prepare('DELETE FROM rule_section_fts WHERE section_id = ?');
  for (const { id } of ids) del.run(Number(id));
  db.prepare('DELETE FROM rule_section WHERE resource_id = ?').run(resourceId);
}

// Removes the sections and their FTS rows (reject, delete, reclassify to example).
export function deleteSectionsSync(resourceId: number): void {
  inTransaction(() => clearSections(resourceId));
}

// Rebuilds the sections of an accepted rule document from its .md. Returns the
// number of sections. The .md is read before the transaction opens.
export async function indexResourceSections(resourceId: number): Promise<number> {
  const row = db
    .prepare('SELECT kind, status, markdown_path FROM resource WHERE id = ?')
    .get(resourceId) as { kind: string; status: string; markdown_path: string | null } | undefined;
  if (!row || row.kind !== 'rule' || row.status !== 'accepted' || !row.markdown_path) return 0;

  const sections = parseRuleSections(await readMarkdown(row.markdown_path));

  inTransaction(() => {
    clearSections(resourceId);
    const insert = db.prepare(
      'INSERT INTO rule_section (resource_id, number, heading, body, part, position) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const insertFts = db.prepare('INSERT INTO rule_section_fts (heading, body, section_id) VALUES (?, ?, ?)');
    for (const s of sections) {
      const r = insert.run(resourceId, s.number, s.heading, s.body, s.part, s.position);
      insertFts.run(s.heading, s.body, Number(r.lastInsertRowid));
    }
    db.prepare(`UPDATE resource SET sections_indexed_at = datetime('now') WHERE id = ?`).run(resourceId);
  });
  return sections.length;
}

// SPEC-033 RF-012: when the rule parser changed (RULE_PARSER_VERSION), every accepted
// rule document is reindexed once. The stored version is app_meta.rule_index_version;
// with it up to date nothing is touched. Citations saved on cases are text, so they
// are not affected (section ids do change; nothing stores them).
export async function reindexIfParserChanged(): Promise<void> {
  const row = db.prepare(`SELECT value FROM app_meta WHERE key = 'rule_index_version'`).get() as { value: string } | undefined;
  const stored = row ? Number(row.value) : 0;
  if (stored >= RULE_PARSER_VERSION) return;
  const res = db
    .prepare(`UPDATE resource SET sections_indexed_at = NULL WHERE kind = 'rule' AND status = 'accepted'`)
    .run();
  console.log(`Rule parser v${RULE_PARSER_VERSION} (was ${stored || 'none'}): reindexing ${res.changes} rule document(s)`);
  await indexPendingSections();
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES ('rule_index_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(RULE_PARSER_VERSION));
}

// Startup (RF-014): index accepted rules not indexed yet, one at a time. An
// error in one resource is logged and leaves its mark NULL for the next start;
// it never stops the startup.
export async function indexPendingSections(): Promise<void> {
  const pending = db
    .prepare(
      `SELECT id FROM resource WHERE kind = 'rule' AND status = 'accepted' AND sections_indexed_at IS NULL`,
    )
    .all() as { id: number }[];
  for (const { id } of pending) {
    try {
      const n = await indexResourceSections(id);
      console.log(`Indexed ${n} rule sections for resource ${id}`);
    } catch (e) {
      console.warn(`Could not index rule sections for resource ${id}: ${(e as Error).message}`);
    }
  }
}
