import { db } from './connection.js';

// node:sqlite has no .transaction(). Synchronous only: do every await (file
// reads) before calling this — there must be no await between BEGIN and COMMIT.
export function inTransaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
