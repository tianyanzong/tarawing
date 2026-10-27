'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { AdminUser, CursorPage } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (cursor) params.set('cursor', cursor);
      const page = await api.get<CursorPage<AdminUser>>(`/api/admin/users?${params}`, true);
      setUsers((current) => cursor ? [...(current || []), ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setRole(id: string, role: string) {
    await api.post(`/api/admin/users/${id}/role`, { role }, true);
    load();
  }
  async function remove(id: string) {
    if (!confirm('Delete this user and all their readings/orders?')) return;
    await api.del(`/api/admin/users/${id}`, true);
    load();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Users</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          placeholder="Search name or email"
          style={{ background: 'var(--ink-panel)', border: '1px solid var(--hairline)', color: 'var(--parchment)', padding: '9px 12px', borderRadius: 3, flex: 1 }}
        />
        <button className="btn btn-ghost" onClick={() => load()} disabled={loading}>Search</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last active</th><th></th></tr></thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} style={{ background: 'var(--ink-panel)', color: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '4px 6px' }}>
                  <option value="normal">normal</option>
                  <option value="banned_temp">banned_temp</option>
                  <option value="banned_perm">banned_perm</option>
                </select>
              </td>
              <td>{u.lastActive ? new Date(u.lastActive).toLocaleString() : '—'}</td>
              <td><button className="btn btn-ghost" onClick={() => remove(u.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <button className="btn btn-ghost" onClick={() => load(nextCursor)} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Loading…' : 'Load more users'}
        </button>
      )}
    </div>
  );
}
