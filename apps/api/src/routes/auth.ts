import type { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import type { SessionUser } from '../auth/session.js';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
}

// Login/logout/whoami (D-026). Cookie-based session (@fastify/secure-
// session, registered in server.ts) — the browser sends it automatically
// on every request, nothing for the frontend to attach by hand.
export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/login', (req, reply) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) return reply.code(400).send({ error: 'username and password are required' });

    const row = db.prepare('SELECT * FROM app_user WHERE username = ?').get(username) as UserRow | undefined;
    if (!row || !verifyPassword(password, row.password_hash)) {
      return reply.code(401).send({ error: 'invalid username or password' });
    }

    const user: SessionUser = { id: row.id, username: row.username, role: row.role };
    req.session.set('user', user);
    return user;
  });

  app.post('/auth/logout', (req, reply) => {
    req.session.delete();
    reply.code(204).send();
  });

  app.get('/auth/me', (req) => req.currentUser);

  // Self-service password change — the only way to change a password
  // once ADMIN_USERNAME/ADMIN_PASSWORD created the account, admin or not.
  app.post('/auth/change-password', (req, reply) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: 'currentPassword and newPassword are required' });
    }

    const user = req.currentUser!;
    const row = db.prepare('SELECT * FROM app_user WHERE id = ?').get(user.id) as unknown as UserRow;
    if (!verifyPassword(currentPassword, row.password_hash)) {
      return reply.code(401).send({ error: 'current password is incorrect' });
    }

    db.prepare('UPDATE app_user SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), user.id);
    reply.code(204).send();
  });
}
