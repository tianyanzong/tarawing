'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useUserAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await api.post<{
        user: User;
        token?: string;
        verificationRequired?: boolean;
        verificationEmailSent?: boolean;
      }>('/api/auth/register', { name, email, password });
      if (res.token) {
        await signIn(res.token, res.user);
        router.push('/dashboard');
      } else {
        setCreatedMessage(res.verificationEmailSent
          ? 'Account created. Check your email for the verification link before signing in.'
          : 'Account created. Email verification is required, but the verification email could not be sent. Contact support or try resending later.');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container container--narrow" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="auth-form">
        <h1 style={{ fontSize: 30, marginBottom: 24 }}>Create your account</h1>
        <form onSubmit={submit}>
          <div className="form-field">
            <label>Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Password (min. 6 characters)</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="form-error">{error}</p>}
          {createdMessage && <p className="form-success">{createdMessage}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="form-note" style={{ marginTop: 18 }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--gold-bright)' }}>Sign in</Link>.
        </p>
      </div>
    </div>
  );
}
