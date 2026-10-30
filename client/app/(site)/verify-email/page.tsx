'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

function VerifyEmailContent() {
  const token = useSearchParams().get('token') || '';
  const started = useRef(false);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError('This verification link is missing its token.');
      setState('error');
      return;
    }
    api.post('/api/auth/verify-email', { token })
      .then(() => setState('success'))
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Could not verify this email.');
        setState('error');
      });
  }, [token]);

  if (state === 'loading') return <p className="form-note">Verifying your email...</p>;
  if (state === 'error') return <p className="form-error">{error}</p>;
  return (
    <>
      <p className="form-success">Your email is verified.</p>
      <Link href="/login" className="btn btn-primary" style={{ marginTop: 18 }}>Sign in</Link>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="container container--narrow" style={{ paddingTop: 60, paddingBottom: 80 }}>
      <div className="auth-form">
        <h1 style={{ fontSize: 30, marginBottom: 24 }}>Email verification</h1>
        <Suspense fallback={<p className="form-note">Loading...</p>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
