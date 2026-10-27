'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Consultation } from '@/lib/types';

export default function AdminConsultationsPage() {
  const [rows, setRows] = useState<Consultation[] | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<Consultation[]>('/api/admin/consultations', true);
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load consultations.');
    }
  }
  useEffect(() => { load(); }, []);

  async function reply(id: string) {
    await api.post(`/api/admin/consultations/${id}/reply`, { reply: replyDrafts[id] || '' }, true);
    load();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Consultations</h1>
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows?.map((c) => (
          <div className="panel" key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="form-note">{c.name || 'Anonymous'} · {c.contact || 'no contact given'}</span>
              <span className={`tag ${c.status === 'answered' ? 'tag--gold' : ''}`}>{c.status}</span>
            </div>
            <p style={{ marginBottom: 12 }}>{c.question}</p>
            {c.adminReply && <p className="form-note" style={{ marginBottom: 12 }}>Reply sent: {c.adminReply}</p>}
            <textarea
              rows={2}
              placeholder="Write a reply…"
              value={replyDrafts[c.id] ?? c.adminReply ?? ''}
              onChange={(e) => setReplyDrafts({ ...replyDrafts, [c.id]: e.target.value })}
              style={{ width: '100%', background: 'var(--ink)', border: '1px solid var(--hairline)', color: 'var(--parchment)', padding: 10, borderRadius: 3, marginBottom: 10 }}
            />
            <button className="btn btn-ghost" onClick={() => reply(c.id)}>Send reply</button>
          </div>
        ))}
        {rows && rows.length === 0 && <p className="form-note">No consultations yet.</p>}
      </div>
    </div>
  );
}
