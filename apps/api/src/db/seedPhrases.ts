import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { db } from './connection.js';

type Box = 'procedural_matters' | 'facts_found' | 'conclusion' | 'decision';

// Sheet name -> box (D-022). Every row of these sheets is a standalone
// [label, wording] pair (col A / col B), skipping the two header rows.
const SIMPLE_SHEETS: Record<string, Box> = {
  'Procedural Matters': 'procedural_matters',
  Validity: 'conclusion',
  'Protest Conclusions': 'conclusion',
  'Redress Conclusions': 'conclusion',
  Reopenings: 'conclusion',
  'Protest Decisions': 'decision',
  'Redress Decisions': 'decision',
};

const seedPath = path.join(import.meta.dirname, '..', '..', 'seed', 'preferred-standard-wording.xlsx');

function cell(row: unknown[], i: number): string {
  const v = row[i];
  return v === undefined || v === null ? '' : String(v).trim();
}

interface Row {
  box: Box;
  label: string;
  body: string;
}

function parseSimpleSheet(sheet: XLSX.WorkSheet, box: Box): Row[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const out: Row[] = [];
  for (const row of rows.slice(2)) {
    const label = cell(row, 0);
    const body = cell(row, 1);
    if (!body) continue;
    out.push({ box, label, body });
  }
  return out;
}

// "NO Hearing" sheet groups four lines under one label: Suggested Fact,
// Conclusion, Decision Short, Decision — split across three boxes.
function parseNoHearingSheet(sheet: XLSX.WorkSheet): Row[] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const out: Row[] = [];
  let groupLabel = '';
  for (const row of rows.slice(1)) {
    const col0 = cell(row, 0);
    const col1 = cell(row, 1);
    if (col0) groupLabel = col0;
    if (!col1) continue;

    const strip = (prefix: string) => col1.slice(prefix.length).trim();
    if (col1.startsWith('Suggested Fact:')) {
      out.push({ box: 'facts_found', label: groupLabel, body: strip('Suggested Fact:') });
    } else if (col1.startsWith('Conclusion:')) {
      out.push({ box: 'conclusion', label: groupLabel, body: strip('Conclusion:') });
    } else if (col1.startsWith('Decision Short:')) {
      out.push({ box: 'decision', label: `${groupLabel} (short)`, body: strip('Decision Short:') });
    } else if (col1.startsWith('Decision:')) {
      out.push({ box: 'decision', label: groupLabel, body: strip('Decision:') });
    }
  }
  return out;
}

// Idempotent: only seeds once. Re-running (every container start, same as
// schema.sql) is a no-op after the first time — checked by count, not a
// unique constraint, since near-duplicate wording rows are expected and
// legitimate (D-022).
export function seedBasePhrases() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM phrase WHERE origin = 'base'").get() as {
    count: number;
  };
  if (count > 0) {
    console.log(`Base phrases already seeded (${count} rows) — skipping.`);
    return;
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(readFileSync(seedPath), { type: 'buffer' });
  } catch (e) {
    console.warn(`Phrase seed file not found or unreadable at ${seedPath} — skipping: ${(e as Error).message}`);
    return;
  }

  const allRows: Row[] = [];
  for (const [sheetName, box] of Object.entries(SIMPLE_SHEETS)) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    allRows.push(...parseSimpleSheet(sheet, box));
  }
  const noHearing = workbook.Sheets['NO Hearing'];
  if (noHearing) allRows.push(...parseNoHearingSheet(noHearing));

  const insertPhrase = db.prepare(
    "INSERT INTO phrase (box, label, body, origin) VALUES (?, ?, ?, 'base')",
  );
  const insertFts = db.prepare('INSERT INTO phrase_fts (label, body, phrase_id) VALUES (?, ?, ?)');

  for (const r of allRows) {
    const result = insertPhrase.run(r.box, r.label, r.body);
    insertFts.run(r.label, r.body, result.lastInsertRowid);
  }

  console.log(`Seeded ${allRows.length} base phrases from ${path.basename(seedPath)}.`);
}
