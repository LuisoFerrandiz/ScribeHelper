import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { hashPassword } from '../auth/password.js';
import { requireAdmin } from '../auth/guard.js';

interface UserRow {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}

// Admin-only user management (D-026). Every route here also passes
// through the global auth guard (server.ts) — requireAdmin only adds
// the role check on top of "must be logged in".
export function registerUserRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requireAdmin }, () =>
    db.prepare('SELECT id, username, role, created_at FROM app_user ORDER BY username').all(),
  );

  app.post('/users', { preHandler: requireAdmin }, (req, reply) => {
    const { username, password, role } = req.body as {
      username?: string;
      password?: string;
      role?: string;
    };
    if (!username?.trim() || !password) {
      return reply.code(400).send({ error: 'username and password are required' });
    }
    if (role && role !== 'admin' && role !== 'user') {
      return reply.code(400).send({ error: "role must be 'admin' or 'user'" });
    }

    const existing = db.prepare('SELECT id FROM app_user WHERE username = ?').get(username.trim());
    if (existing) return reply.code(409).send({ error: 'username already exists' });

    const result = db
      .prepare('INSERT INTO app_user (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username.trim(), hashPassword(password), role ?? 'user');

    const row = db
      .prepare('SELECT id, username, role, created_at FROM app_user WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as UserRow;
    reply.code(201).send(row);
  });

  app.delete('/users/:id', { preHandler: requireAdmin }, (req, reply) => {
    const { id } = req.params as { id: string };
    const row = db.prepare('SELECT * FROM app_user WHERE id = ?').get(id) as UserRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });

    if (row.role === 'admin') {
      const adminCount = (
        db.prepare("SELECT COUNT(*) AS n FROM app_user WHERE role = 'admin'").get() as { n: number }
      ).n;
      if (adminCount <= 1) return reply.code(409).send({ error: 'cannot delete the last admin' });
    }

    db.prepare('DELETE FROM app_user WHERE id = ?').run(id);
    reply.code(204).send();
  });
}
