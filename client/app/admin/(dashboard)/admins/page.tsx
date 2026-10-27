'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth';
import type { AdminAccount } from '@/lib/types';

const PERMS = ['users', 'orders', 'readings', 'consults', 'settings', 'content'];

export default function AdminAccountsPage() {
  const { session: self } = useAdminAuth();
  const [rows, setRows] = useState<AdminAccount[] | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'super'>('admin');
  const [perms, setPerms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() { setRows(await api.get<AdminAccount[]>('/api/admin/admins', true)); }
  useEffect(() => { load().catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load admins.')); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/admin/admins', { username, password, role, permissions: perms }, true);
      setUsername(''); setPassword(''); setPerms([]);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create admin.');
    }
  }
  async function remove(id: string) {
    if (!confirm('Delete this admin account?')) return;
    await api.del(`/api/admin/admins/${id}`, true);
    load();
  }

  if (!self?.isSuper) return <p className="form-error">Super admin only.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>Admin accounts</h1>
        {error && <p className="form-error">{error}</p>}
        <table className="data-table">
          <thead><tr><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows?.map((a) => (
              <tr key={a.id}>
                <td>{a.username}</td><td>{a.role}</td><td>{a.status}</td>
                <td>{a.id !== self.id && <button className="btn btn-ghost" onClick={() => remove(a.id)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="panel">
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>New admin</h2>
        <div className="form-field"><label>Username</label><input required value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div className="form-field"><label>Password</label><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="form-field">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'super')}>
            <option value="admin">admin</option>
            <option value="super">super</option>
          </select>
        </div>
        {role === 'admin' && (
          <div className="form-field">
            <label>Permission domains</label>
            {PERMS.map((p) => (
              <label key={p} style={{ display: 'block', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={perms.includes(p)}
                  onChange={(e) => setPerms(e.target.checked ? [...perms, p] : perms.filter((x) => x !== p))}
                  style={{ marginRight: 8 }}
                />
                {p}
              </label>
            ))}
          </div>
        )}
        <button className="btn btn-primary" type="submit">Create admin</button>
      </form>
    </div>
  );
}
