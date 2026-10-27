'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, downloadFile, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { ReadingView } from '@/lib/types';

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function ReportFlow({ readingId }: { readingId: string }) {
  const [view, setView] = useState<ReadingView | null>(null);
  const { status } = useUserAuth();
  // Anonymous-generated simple report text lives here, not in `view` —
  // the server deliberately doesn't persist it for anonymous callers, so
  // it would never show up in a re-fetched view.
  const [anonSimpleReport, setAnonSimpleReport] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const v = await api.get<ReadingView>(`/api/readings/${readingId}`);
      setView(v);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this reading.');
    }
  }

  useEffect(() => {
    refresh(); // works for anonymous visitors too (optAuth on the server)
  }, [readingId]);

  async function generateSimpleReport() {
    setBusy('simple'); setError(null);
    try {
      const res = await api.post<{ simpleReport: string; saved: boolean }>(`/api/readings/${readingId}/simple-report`);
      if (res.saved) {
        await refresh();
      } else {
        setAnonSimpleReport(res.simpleReport);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate the report.');
    } finally {
      setBusy(null);
    }
  }

  async function buyTier(tier: 'detail' | 'deep_insights') {
    setBusy(tier); setError(null);
    try {
      const order = await api.post<{ id: string }>('/api/orders', { readingId, tier });
      await api.post(`/api/orders/${order.id}/simulate-sandbox-pay`);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Payment could not be completed.');
    } finally {
      setBusy(null);
    }
  }

  async function payExistingOrder(orderId: string) {
    setBusy('pay'); setError(null);
    try {
      await api.post(`/api/orders/${orderId}/simulate-sandbox-pay`);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Payment could not be completed.');
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy('pdf'); setError(null);
    try {
      await downloadFile(`/api/readings/${readingId}/export-pdf`, `tarawing-detailed-report.pdf`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not export the PDF.');
    } finally {
      setBusy(null);
    }
  }

  if (!view) {
    return error ? <p className="form-error" style={{ marginTop: 20 }}>{error}</p> : null;
  }

  const simpleReportText = view.simpleReport || anonSimpleReport;

  return (
    <div style={{ marginTop: 28 }}>
      {error && <p className="form-error">{error}</p>}

      {/* Free tier — open to anonymous visitors, no sign-in required. */}
      {!simpleReportText && (
        <button className="btn btn-primary" onClick={generateSimpleReport} disabled={busy === 'simple'}>
          {busy === 'simple' ? 'Generating…' : 'Generate report'}
        </button>
      )}

      {simpleReportText && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 className="heading-tarot" style={{ fontSize: 17, marginBottom: 10 }}>Simple Report</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{simpleReportText}</p>
        </div>
      )}

      {/* Everything past this point is paid, so it requires an account. */}
      {simpleReportText && (status === 'anonymous' || status === 'error') && (
        <div className="panel">
          <p className="form-note">
            <Link href="/login" style={{ color: 'var(--gold-bright)' }}>Sign in</Link> to save this report to your
            dashboard{view.pricing ? `, unlock the detailed report (${fmt(view.pricing.detailCents)}), and order a Deep Insights report (${fmt(view.pricing.deepInsightsCents)})` : ' and unlock deeper reports'}.
          </p>
        </div>
      )}

      {simpleReportText && status === 'authenticated' && !view.detailedUnlocked && view.pricing && (
        <button className="btn btn-primary" onClick={() => buyTier('detail')} disabled={busy === 'detail'}>
          {busy === 'detail' ? 'Unlocking…' : `View Detailed Report (${fmt(view.pricing.detailCents)})`}
        </button>
      )}

      {view.detailedUnlocked && view.detailedReport && (
        <div className="panel" style={{ marginTop: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <h3 className="heading-tarot" style={{ fontSize: 17 }}>Detailed Report</h3>
            <button className="btn btn-ghost" onClick={exportPdf} disabled={busy === 'pdf'} style={{ padding: '6px 12px', fontSize: 13 }}>
              {busy === 'pdf' ? 'Exporting…' : 'Export as PDF'}
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{view.detailedReport}</p>
        </div>
      )}

      {view.detailedUnlocked && (
        <div style={{ marginTop: 16 }}>
          {view.deepInsights.ready && view.deepInsights.report && (
            <div className="panel" style={{ borderColor: 'var(--gold)' }}>
              <h3 className="heading-tarot" style={{ fontSize: 17, marginBottom: 10, color: 'var(--gold-bright)' }}>Deep Insights Report</h3>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{view.deepInsights.report}</p>
            </div>
          )}

          {view.deepInsights.pending && (
            <div className="panel">
              <p className="form-note" style={{ marginBottom: 10 }}>
                Your Deep Insights report has been paid for and is being prepared — check back soon.
              </p>
              <button className="btn btn-ghost" onClick={refresh}>Check again</button>
            </div>
          )}

          {!view.deepInsights.ordered && view.pricing && (
            <button className="btn btn-primary" onClick={() => buyTier('deep_insights')} disabled={busy === 'deep_insights'}>
              {busy === 'deep_insights' ? 'Ordering…' : `Get Deep Insights Report (${fmt(view.pricing.deepInsightsCents)})`}
            </button>
          )}

          {view.deepInsights.ordered && !view.deepInsights.paid && view.deepInsights.orderId && (
            <button className="btn btn-primary" onClick={() => payExistingOrder(view.deepInsights.orderId!)} disabled={busy === 'pay'}>
              {busy === 'pay' ? 'Completing payment…' : 'Complete payment for Deep Insights Report'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
