import { convertSeedToMarkdown } from '../phrases/convertSeedToMarkdown.js';
import { parseSeedMarkdown } from '../phrases/parseSeedMarkdown.js';
import { db } from './connection.js';

// Idempotent: only seeds once. Re-running (every container start, same as
// schema.sql) is a no-op after the first time — checked by count, not a
// unique constraint, since near-duplicate wording rows in the source are
// legitimate, not bugs. (D-022, SPEC-005 RF-003: reads the seed .xlsx via
// its converted .md, not the .xlsx directly — convertSeedToMarkdown only
// converts once, on first run.)
export async function seedBasePhrases() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM phrase WHERE origin = 'base'").get() as {
    count: number;
  };
  if (count > 0) {
    console.log(`Base phrases already seeded (${count} rows) — skipping.`);
    return;
  }

  let markdown: string;
  try {
    markdown = await convertSeedToMarkdown();
  } catch (e) {
    console.warn(`Phrase seed source unreadable — skipping: ${(e as Error).message}`);
    return;
  }

  const allRows = parseSeedMarkdown(markdown);

  const insertPhrase = db.prepare(
    "INSERT INTO phrase (box, label, body, origin) VALUES (?, ?, ?, 'base')",
  );
  const insertFts = db.prepare('INSERT INTO phrase_fts (label, body, phrase_id) VALUES (?, ?, ?)');

  for (const r of allRows) {
    const result = insertPhrase.run(r.box, r.label, r.body);
    insertFts.run(r.label, r.body, result.lastInsertRowid);
  }

  console.log(`Seeded ${allRows.length} base phrases from the converted preferred-standard-wording.md.`);
}
