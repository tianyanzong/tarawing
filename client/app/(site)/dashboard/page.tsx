'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, downloadFile, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { CursorPage, ReadingSummary } from '@/lib/types';
import AccountSettings from '@/components/AccountSettings';

const STATUS_CLASS: Record<string, string> = {
  detail_unpaid: 'tag--sky',
  detail_tobepaid: 'tag--gold',
  detail_paid: 'tag--gold',
  detail_unlocked: 'tag--gold',
};

export default function DashboardPage() {
  const { status, error: authError, refresh } = useUserAuth();
  const [tab, setTab] = useState<'readings' | 'account'>('readings');
  const [readings, setReadings] = useState<ReadingSummary[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  async function downloadReport(reading: ReadingSummary, tier: 'detail' | 'deep_insights') {
    const key = `${reading.id}-${tier}`;
    setDownloading(key);
    setError(null);
    try {
      const query = tier === 'deep_insights' ? '?tier=deep_insights' : '';
      const filename = `${reading.type.replaceAll('_', '-')}-${tier === 'deep_insights' ? 'deep-insights' : 'detailed'}.pdf`;
      await downloadFile(`/api/readings/${reading.id}/export-pdf${query}`, filename);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not download the report.');
    } finally {
      setDownloading(null);
    }
  }

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
                    <span className={`tag ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span>
                    {r.detailedReportReady && <span className="tag tag--sky" style={{ marginLeft: 6 }}>detail ready</span>}
                    {r.deepInsightsReady && <span className="tag tag--gold" style={{ marginLeft: 6 }}>deep insights ready</span>}
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/readings/${r.id}`} className="btn btn-ghost btn-compact">View</Link>
                      {r.detailedReportReady && (
                        <button
                          className="btn btn-ghost btn-compact"
                          onClick={() => downloadReport(r, 'detail')}
                          disabled={downloading === `${r.id}-detail`}
                        >
                          {downloading === `${r.id}-detail` ? 'Downloading...' : 'Download detail PDF'}
                        </button>
                      )}
                      {r.deepInsightsReady && (
                        <button
                          className="btn btn-ghost btn-compact"
                          onClick={() => downloadReport(r, 'deep_insights')}
                          disabled={downloading === `${r.id}-deep_insights`}
                        >
                          {downloading === `${r.id}-deep_insights` ? 'Downloading...' : 'Download Deep Insights PDF'}
                        </button>
                      )}
                    </div>
                  </td>
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
