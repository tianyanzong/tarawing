'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalReadings: number;
  paidOrders: number;
  revenueCents: number;
  readingsByType: { type: string; c: number }[];
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Stats>('/api/admin/stats', true).then(setStats).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load stats.'));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <p className="form-note">Loading…</p>;

  const cards = [
    { label: 'Users', value: stats.totalUsers },
    { label: 'Readings drawn', value: stats.totalReadings },
    { label: 'Paid orders', value: stats.paidOrders },
    { label: 'Revenue', value: `$${(stats.revenueCents / 100).toFixed(2)}` },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 34 }}>
        {cards.map((c) => (
          <div className="panel" key={c.label}>
            <div className="form-note">{c.label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--gold-bright)', marginTop: 8 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 19, marginBottom: 14 }}>Readings by tool</h2>
      <table className="data-table">
        <thead><tr><th>Type</th><th>Count</th></tr></thead>
        <tbody>
          {stats.readingsByType.map((r) => (
            <tr key={r.type}><td>{r.type.replace(/_/g, ' ')}</td><td>{r.c}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
