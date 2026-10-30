'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useUserAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setVerificationRequired(false); setResendMessage(null);
    try {
      const res = await api.post<{ user: User; token: string }>('/api/auth/login', { email, password });
      await signIn(res.token, res.user);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign-in failed.');
      const details = e instanceof ApiError ? e.details as { code?: string } | undefined : undefined;
      if (e instanceof ApiError && e.status === 403 && details?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationRequired(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResending(true); setError(null); setResendMessage(null);
    try {
      await api.post('/api/auth/resend-verification', { email });
      setResendMessage('A new verification email has been sent.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend the verification email.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="container container--narrow" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="auth-form">
        <h1 style={{ fontSize: 30, marginBottom: 24 }}>Sign in</h1>
        <form onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <p className="form-note" style={{ marginTop: -8, marginBottom: 16 }}>
            <Link href="/forgot-password" style={{ color: 'var(--sky-bright)' }}>Forgot password?</Link>
          </p>
          {error && <p className="form-error">{error}</p>}
          {verificationRequired && (
            <div className="auth-inline-action">
              <button className="btn btn-ghost btn-compact" type="button" onClick={resendVerification} disabled={resending}>
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendMessage && <p className="form-success">{resendMessage}</p>}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="form-note" style={{ marginTop: 18 }}>
          No account yet? <Link href="/register" style={{ color: 'var(--gold-bright)' }}>Create one</Link>.
        </p>
      </div>
    </div>
  );
}
