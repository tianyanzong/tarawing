'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

function ResetPasswordContent() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reset the password.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <p className="form-error">This reset link is missing its token.</p>;
  }

  return (
    <>
      {submitted ? (
        <>
          <p className="form-success">Your password has been reset.</p>
          <Link href="/login" className="btn btn-primary" style={{ marginTop: 18 }}>Sign in</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="reset-new-password">New password</label>
            <input id="reset-new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="form-field">
            <label htmlFor="reset-confirm-password">Confirm password</label>
            <input id="reset-confirm-password" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container container--narrow" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="auth-form">
        <h1 style={{ fontSize: 30, marginBottom: 24 }}>Choose a new password</h1>
        <Suspense fallback={<p className="form-note">Loading...</p>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
