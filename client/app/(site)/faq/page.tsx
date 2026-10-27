'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { FaqItem } from '@/lib/types';

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api.get<FaqItem[]>('/api/faq').then(setFaqs).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the FAQ.'));
  }, []);

  return (
    <div className="container container--narrow" style={{ paddingTop: 50, paddingBottom: 70 }}>
      <h1 style={{ fontSize: 34, marginBottom: 30 }}>Frequently asked questions</h1>
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--hairline)', border: '1px solid var(--hairline)' }}>
        {faqs?.map((f) => {
          const open = openId === f.id;
          return (
            <div key={f.id} style={{ background: 'var(--ink)' }}>
              <button
                onClick={() => setOpenId(open ? null : f.id)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--parchment)', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', fontSize: 15.5 }}
              >
                <span>{f.question}</span>
                <span style={{ color: 'var(--gold)' }}>{open ? '−' : '+'}</span>
              </button>
              {open && <p style={{ padding: '0 20px 18px', color: 'var(--parchment-dim)', lineHeight: 1.6 }}>{f.answer}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
