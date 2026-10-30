'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { DeepInsightsQueueItem } from '@/lib/types';

export default function DeepInsightsQueuePage() {
  const [rows, setRows] = useState<DeepInsightsQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await api.get<DeepInsightsQueueItem[]>('/api/admin/deep-insights-queue', true));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the queue.');
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Deep Insights Queue</h1>
      <p className="form-note" style={{ marginBottom: 20 }}>
        Paid Deep Insights orders whose report hasn't been generated yet — either
        because auto-generation is off in Settings, or a prior AI attempt failed.
      </p>
      {error && <p className="form-error">{error}</p>}
      <table className="data-table">
        <thead><tr><th>Type</th><th>User</th><th>Category</th><th>Question</th><th>Paid</th><th></th></tr></thead>
        <tbody>
          {rows?.map((r) => (
            <tr key={r.orderId}>
              <td>{r.type.replace(/_/g, ' ')}</td>
              <td>{r.userEmail || '-'}</td>
              <td>{r.category}</td>
              <td>{r.question || '—'}</td>
              <td>{r.paidAt ? new Date(r.paidAt).toLocaleString() : '—'}</td>
              <td><Link href={`/admin/readings?id=${r.readingId}`} className="btn btn-ghost">Open in Readings</Link></td>
            </tr>
          ))}
          {rows && rows.length === 0 && <tr><td colSpan={6} className="form-note">Nothing pending - the queue is empty.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
