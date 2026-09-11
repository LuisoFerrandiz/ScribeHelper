import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { config } from '../config.js';

// Single file under data/db (RULES.md R-13). Excluded from git and
// Syncthing (DECISIONS.md D-013).
//
// Uses Node's built-in node:sqlite (stable, no native compile step) rather
// than better-sqlite3. better-sqlite3 needs a C++ toolchain to build from
// source when no prebuilt binary matches the Node version, which failed in
// this environment (no Visual Studio). See DECISIONS.md D-016.
const dbPath = path.join(config.dataDir, 'db', 'scribe_helper.sqlite');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
