'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await api.post<{ token: string }>('/api/admin/login', { username, password });
      await signIn(res.token);
      router.push('/admin');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container container--narrow" style={{ paddingTop: 90, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Admin sign in</h1>
      <p className="form-note" style={{ marginBottom: 26 }}>Tarawing internal console.</p>
      <form onSubmit={submit}>
        <div className="form-field">
          <label>Username</label>
          <input required value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="form-field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="form-note" style={{ marginTop: 18 }}>
        Bootstrap credentials: username from <code>ADMIN_USERNAME</code> (default <code>admin</code>),
        password from <code>ADMIN_TOKEN</code> in <code>server/.env</code>.
      </p>
    </div>
  );
}
