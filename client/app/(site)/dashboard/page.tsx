'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { CursorPage, ReadingSummary } from '@/lib/types';
import AccountSettings from '@/components/AccountSettings';
import BrandLogo from '@/components/BrandLogo';

export default function DashboardPage() {
  const { status, error: authError, refresh } = useUserAuth();
  const [tab, setTab] = useState<'readings' | 'account'>('readings');
  const [readings, setReadings] = useState<ReadingSummary[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReadings(cursor?: string) {
    setLoadingMore(!!cursor);
    try {
      const page = await api.get<CursorPage<ReadingSummary>>(
        `/api/readings${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      setReadings((current) => cursor ? [...(current || []), ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load readings.');
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      setError(null);
      loadReadings();
    } else if (status === 'anonymous') {
      setReadings(null);
      setNextCursor(null);
      setError('Please sign in to view your dashboard.');
    } else if (status === 'error') {
      setError(authError || 'Could not verify your session.');
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return <div className="container" style={{ paddingTop: 50 }}><p className="form-note">Checking your session...</p></div>;
  }

  if (error && !readings) {
    return (
      <div className="container container--narrow" style={{ paddingTop: 60 }}>
        <p className="form-error">{error}</p>
        {status === 'error'
          ? <button className="btn btn-ghost" onClick={() => refresh()}>Try again</button>
          : <Link href="/login" className="btn btn-primary">Sign in</Link>}
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <header className="workspace-header">
        <BrandLogo variant="circular" priority />
        <div>
          <p className="workspace-header__eyebrow">Your workspace</p>
          <h1>Your dashboard</h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button className={`tab-btn ${tab === 'readings' ? 'is-active' : ''}`} onClick={() => setTab('readings')}>Readings</button>
        <button className={`tab-btn ${tab === 'account' ? 'is-active' : ''}`} onClick={() => setTab('account')}>Account settings</button>
      </div>

      {tab === 'readings' && (
        <>
          <p className="form-note" style={{ marginBottom: 20 }}>
            Open any reading to generate its free report, then unlock the detailed report and, if you want it, a Deep Insights report.
          </p>
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Question</th><th>Status</th><th>Drawn</th><th></th></tr>
            </thead>
            <tbody>
              {readings?.map((r) => (
                <tr key={r.id}>
                  <td>{r.type.replace(/_/g, ' ')}</td>
                  <td>{r.question || '—'}</td>
                  <td>
                    <span className={`tag ${r.status === 'detail_unlocked' ? 'tag--gold' : ''}`}>{r.status}</span>
                    {r.deepInsightsReport && <span className="tag tag--gold" style={{ marginLeft: 6 }}>deep insights ready</span>}
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td><Link href={`/readings/${r.id}`} className="btn btn-ghost">View</Link></td>
                </tr>
              ))}
              {readings && readings.length === 0 && (
                <tr><td colSpan={5} className="form-note">No readings yet — go draw one.</td></tr>
              )}
            </tbody>
          </table>
          {nextCursor && (
            <button className="btn btn-ghost" onClick={() => loadReadings(nextCursor)} disabled={loadingMore} style={{ marginTop: 16 }}>
              {loadingMore ? 'Loading…' : 'Load more readings'}
            </button>
          )}
        </>
      )}

      {tab === 'account' && <AccountSettings />}
    </div>
  );
}
