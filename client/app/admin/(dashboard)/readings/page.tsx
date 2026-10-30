'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { AdminReadingDetail, AdminReadingSummary, CursorPage } from '@/lib/types';

function AdminReadingsPageContent() {
  const params = useSearchParams();
  const [rows, setRows] = useState<AdminReadingSummary[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<AdminReadingDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [manualText, setManualText] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    setLoadingMore(!!cursor);
    try {
      const page = await api.get<CursorPage<AdminReadingSummary>>(
        `/api/admin/readings${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        true,
      );
      setRows((current) => cursor ? [...(current || []), ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load readings.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function open(id: string) {
    const r = await api.get<AdminReadingDetail>(`/api/admin/readings/${id}`, true);
    setSelected(r);
    setNotes(r.adminNotes || '');
    setManualText(r.deepInsightsReport || '');
    setPromptCopied(false);
  }

  useEffect(() => {
    load();
    const deepLinkId = params.get('id');
    if (deepLinkId) open(deepLinkId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateAi() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const res = await api.post<{ deepInsightsReport: string }>(`/api/admin/readings/${selected.id}/deep-insights/generate-ai`, {}, true);
      setSelected({ ...selected, deepInsightsReport: res.deepInsightsReport });
      setManualText(res.deepInsightsReport);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'AI generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function saveManual() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/api/admin/readings/${selected.id}/deep-insights/save-manual`, { text: manualText }, true);
      setSelected({ ...selected, deepInsightsReport: manualText });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the report.');
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    await api.post(`/api/admin/readings/${selected.id}/notes`, { notes }, true);
  }

  async function copyPrompt() {
    if (!selected?.aiPrompt) return;
    await navigator.clipboard.writeText(selected.aiPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1800);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>Readings</h1>
        {error && <p className="form-error">{error}</p>}
        <table className="data-table">
          <thead><tr><th>Type</th><th>User</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{r.type.replace(/_/g, ' ')}</td>
                <td>{r.userEmail || r.userId || 'Anonymous'}</td>
                <td><span className={`tag ${['detail_paid', 'detail_unlocked'].includes(r.status) ? 'tag--gold' : ''}`}>{r.status}</span></td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td><button className="btn btn-ghost" onClick={() => open(r.id)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {nextCursor && (
          <button className="btn btn-ghost" onClick={() => load(nextCursor)} disabled={loadingMore} style={{ marginTop: 16 }}>
            {loadingMore ? 'Loading…' : 'Load more readings'}
          </button>
        )}
      </div>
      {selected && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 19 }}>{selected.type.replace(/_/g, ' ')}</h2>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
          </div>
          {selected.question && <p className="form-note" style={{ marginBottom: 14 }}>Question: {selected.question}</p>}
          <p className="form-note" style={{ marginBottom: 14 }}>User: {selected.userEmail || selected.userId || 'Anonymous'}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, background: 'var(--ink)', padding: 12, borderRadius: 3, maxHeight: 180, overflow: 'auto' }}>
            {JSON.stringify(selected.resultBasic, null, 2)}
          </pre>

          <div className="form-field" style={{ marginTop: 18 }}>
            <label>Admin notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
          </div>

          {selected.simpleReport && (
            <div className="form-field">
              <label>Simple report (free, algorithmic)</label>
              <p className="form-note" style={{ whiteSpace: 'pre-wrap' }}>{selected.simpleReport}</p>
            </div>
          )}
          {selected.detailedReport && (
            <div className="form-field">
              <label>Detailed report (paid, algorithmic)</label>
              <p className="form-note" style={{ whiteSpace: 'pre-wrap' }}>{selected.detailedReport}</p>
            </div>
          )}
          {selected.aiPrompt && (
            <div className="form-field">
              <div className="report-section-heading">
                <label htmlFor="admin-ai-prompt">AI generation prompt</label>
                <button className="btn btn-ghost btn-compact" onClick={copyPrompt}>
                  {promptCopied ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
              <textarea
                id="admin-ai-prompt"
                readOnly
                rows={8}
                value={selected.aiPrompt}
                style={{ fontSize: 12.5 }}
              />
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--hairline)', margin: '18px 0' }} />
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Deep Insights Report</h3>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" onClick={generateAi} disabled={busy} style={{ marginBottom: 14 }}>
            {busy ? 'Working…' : selected.deepInsightsReport ? 'Regenerate via AI' : 'Generate via AI'}
          </button>
          <div className="form-field">
            <label>Or write/edit manually</label>
            <textarea rows={6} value={manualText} onChange={(e) => setManualText(e.target.value)} />
          </div>
          <button className="btn btn-ghost" onClick={saveManual} disabled={busy}>Save manual text</button>
        </div>
      )}
    </div>
  );
}

export default function AdminReadingsPage() {
  return (
    <Suspense fallback={<p className="form-note">Loading readings...</p>}>
      <AdminReadingsPageContent />
    </Suspense>
  );
}
