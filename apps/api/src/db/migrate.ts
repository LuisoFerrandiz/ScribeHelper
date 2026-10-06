import { readFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './connection.js';
import { seedBasePhrases } from './seedPhrases.js';
import { seedAdminUser } from './seedAdmin.js';

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

await seedBasePhrases();
seedAdminUser();
