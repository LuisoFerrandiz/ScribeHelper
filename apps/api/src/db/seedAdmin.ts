import { db } from './connection.js';
import { hashPassword } from '../auth/password.js';

// Phase 5.5 (D-026): the one and only way an admin account gets created —
// there is no signup screen, no "first user becomes admin" trick. Reads
// ADMIN_USERNAME/ADMIN_PASSWORD from the environment (.env, same pattern
// as ANTHROPIC_API_KEY) and creates that user once, idempotently.
export function seedAdminUser() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log('ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  const existing = db.prepare('SELECT id FROM app_user WHERE username = ?').get(username);
  if (existing) {
    console.log(`Admin user "${username}" already exists — skipping.`);
    return;
  }

  db.prepare("INSERT INTO app_user (username, password_hash, role) VALUES (?, ?, 'admin')").run(
    username,
    hashPassword(password),
  );
  console.log(`Admin user "${username}" created.`);
}
