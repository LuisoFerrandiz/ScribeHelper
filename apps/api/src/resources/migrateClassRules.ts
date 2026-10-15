import { access, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { db } from '../db/connection.js';

// SPEC-033 RF-008: class rules stop being a global layer and become event documents
// (layer 'event', doc_type 'class'). Runs at every start, idempotent, and never
// stops the startup: anything it cannot decide is skipped with a warning and the row
// stays as the legacy layer 'class' (still citable, see prefixFor / ELIGIBLE_SQL).

interface ClassRow {
  id: number;
  title: string;
  markdown_path: string | null;
}

const exists = (rel: string) =>
  access(path.join(config.dataDir, rel)).then(
    () => true,
    () => false,
  );

// The only event, or the one named TEST when there are several; null = cannot decide.
function targetEventId(): number | null {
  const events = db.prepare('SELECT id, name FROM event ORDER BY id').all() as { id: number; name: string }[];
  if (events.length === 1) return events[0].id;
  const test = events.filter((e) => e.name.trim().toUpperCase() === 'TEST');
  return test.length === 1 ? test[0].id : null;
}

export async function migrateClassRules(): Promise<void> {
  try {
    const rows = db
      .prepare(`SELECT id, title, markdown_path FROM resource WHERE kind = 'rule' AND layer = 'class'`)
      .all() as unknown as ClassRow[];
    if (rows.length === 0) return;

    const eventId = targetEventId();
    if (eventId === null) {
      console.warn(
        `Migration skipped: ${rows.length} class rule document(s) found but no single target event ` +
          `(need exactly one event, or one named TEST). They stay as legacy class rules.`,
      );
      return;
    }

    for (const row of rows) {
      try {
        let newPath = row.markdown_path;
        if (row.markdown_path) {
          const target = path.join('rules', 'event', path.basename(row.markdown_path));
          if (await exists(row.markdown_path)) {
            await mkdir(path.join(config.dataDir, 'rules', 'event'), { recursive: true });
            await rename(path.join(config.dataDir, row.markdown_path), path.join(config.dataDir, target));
            newPath = target;
          } else if (await exists(target)) {
            newPath = target; // already moved by an earlier, interrupted run
          } else {
            console.warn(`Migration skipped for class rules ${row.id} (${row.title}): its .md file is missing`);
            continue;
          }
        }
        // One statement keeps (layer = 'event') = (event_id IS NOT NULL) true at every moment.
        db.prepare(
          `UPDATE resource SET layer = 'event', event_id = ?, doc_type = 'class', markdown_path = ?, sections_indexed_at = NULL
           WHERE id = ? AND layer = 'class'`,
        ).run(eventId, newPath, row.id);
        console.log(`Migration: class rules ${row.id} (${row.title}) -> event ${eventId} (class)`);
      } catch (e) {
        console.warn(`Migration failed for class rules ${row.id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    console.warn(`Class rules migration failed: ${(e as Error).message}`);
  }
}
