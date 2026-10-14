import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './connection.js';
import { seedBasePhrases } from './seedPhrases.js';
import { seedAdminUser } from './seedAdmin.js';
import { indexPendingSections } from '../resources/sectionIndex.js';

const schemaPath = path.join(import.meta.dirname, '..', '..', 'db', 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');

db.exec(schema);
console.log('Schema applied:', schemaPath);

// SPEC-016: first real ALTER TABLE in this project — CREATE TABLE IF
// NOT EXISTS above does nothing to a table that already exists, and
// the deployed DB already has protest_case with real data. Runs on
// every container start (Dockerfile), so it must be idempotent.
const hasWithCaseNote = (db.prepare(`PRAGMA table_info(protest_case)`).all() as { name: string }[]).some(
  (c) => c.name === 'with_case_note',
);
if (!hasWithCaseNote) {
  db.exec(`ALTER TABLE protest_case ADD COLUMN with_case_note TEXT`);
  console.log('Migration: added protest_case.with_case_note');
}

// SPEC-017: second real ALTER TABLE (first was with_case_note, SPEC-016).
const hasNotes = (db.prepare(`PRAGMA table_info(protest_case)`).all() as { name: string }[]).some(
  (c) => c.name === 'notes',
);
if (!hasNotes) {
  db.exec(`ALTER TABLE protest_case ADD COLUMN notes TEXT NOT NULL DEFAULT ''`);
  console.log('Migration: added protest_case.notes');
}

// SPEC-023: Rules Applicable becomes a writing box; free text next to the
// case_rule_citation registry (D-032).
const hasRulesApplicable = (db.prepare(`PRAGMA table_info(protest_case)`).all() as { name: string }[]).some(
  (c) => c.name === 'rules_applicable',
);
if (!hasRulesApplicable) {
  db.exec(`ALTER TABLE protest_case ADD COLUMN rules_applicable TEXT NOT NULL DEFAULT ''`);
  console.log('Migration: added protest_case.rules_applicable');
}

// SPEC-022 (D-034): resource.doc_type (nor | si | si_amendment, only for
// layer 'event'; enforced by the server, not a CHECK, because the table cannot
// widen a CHECK without being recreated) and sections_indexed_at (RF-014).
const resourceCols = (db.prepare(`PRAGMA table_info(resource)`).all() as { name: string }[]).map((c) => c.name);
if (!resourceCols.includes('doc_type')) {
  db.exec(`ALTER TABLE resource ADD COLUMN doc_type TEXT`);
  console.log('Migration: added resource.doc_type');
}
if (!resourceCols.includes('sections_indexed_at')) {
  db.exec(`ALTER TABLE resource ADD COLUMN sections_indexed_at TEXT`);
  console.log('Migration: added resource.sections_indexed_at');
}
await indexPendingSections();

await seedBasePhrases();
seedAdminUser();
