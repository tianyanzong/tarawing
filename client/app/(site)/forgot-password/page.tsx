'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not request a reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container container--narrow" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="auth-form">
        <h1 style={{ fontSize: 30, marginBottom: 12 }}>Reset your password</h1>
        <p className="form-note" style={{ marginBottom: 22 }}>
          Enter your account email and we will send a reset link if an account exists.
        </p>
        {submitted ? (
          <>
            <p className="form-success">If that email is registered, a reset link has been sent.</p>
            <Link href="/login" className="btn btn-ghost" style={{ marginTop: 18 }}>Back to sign in</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="forgot-email">Email</label>
              <input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
