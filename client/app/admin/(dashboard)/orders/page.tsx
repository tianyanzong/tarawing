'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { CursorPage, Order } from '@/lib/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string, nextStatus = status) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus) params.set('status', nextStatus);
      if (cursor) params.set('cursor', cursor);
      const query = params.toString();
      const page = await api.get<CursorPage<Order>>(
        `/api/admin/orders${query ? `?${query}` : ''}`,
        true,
      );
      setOrders((current) => cursor ? [...(current || []), ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id: string) {
    await api.del(`/api/admin/orders/${id}`, true);
    load();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Orders</h1>
      <div style={{ marginBottom: 20 }}>
        <select value={status} onChange={(e) => { const next = e.target.value; setStatus(next); load(undefined, next); }} style={{ background: 'var(--ink-panel)', color: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '8px 10px' }}>
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="refunded">refunded</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      <table className="data-table">
        <thead><tr><th>Product</th><th>Amount</th><th>Status</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {orders?.map((o) => (
            <tr key={o.id}>
              <td>{o.productCode}</td>
              <td>${(o.amountCents / 100).toFixed(2)} {o.currency}</td>
              <td><span className={`tag ${o.status === 'paid' ? 'tag--gold' : ''}`}>{o.status}</span></td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td><button className="btn btn-ghost" onClick={() => remove(o.id)}>Remove</button></td>
            </tr>
          ))}
          {orders && orders.length === 0 && <tr><td colSpan={5} className="form-note">No orders match this filter.</td></tr>}
        </tbody>
      </table>
      {nextCursor && (
        <button className="btn btn-ghost" onClick={() => load(nextCursor)} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Loading…' : 'Load more orders'}
        </button>
      )}
    </div>
  );
}
