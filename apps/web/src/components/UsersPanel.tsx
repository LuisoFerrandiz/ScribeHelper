import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { UserRole, UserRow } from '../types';

// Admin-only (D-026) — the API also enforces this (requireAdmin), this
// is just where it's reachable from in the UI.
export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setUsers(await api.listUsers());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createUser({ username: username.trim(), password, role });
      setUsername('');
      setPassword('');
      setRole('user');
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteUser(id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="page">
      <h2>Users</h2>
      {error && <p className="error">{error}</p>}

      <ul className="list">
        {users.map((u) => (
          <li key={u.id}>
            {u.username} <span className="muted">({u.role})</span>{' '}
            <button type="button" onClick={() => handleDelete(u.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="inline-form">
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Create user</button>
      </form>
    </div>
  );
}
