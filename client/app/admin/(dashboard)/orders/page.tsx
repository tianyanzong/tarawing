'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { CursorPage, Order } from '@/lib/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
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

  async function reviewPayment(id: string, action: 'verify-payment' | 'reject-payment') {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/admin/orders/${id}/${action}`, {}, true);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this payment.');
    } finally {
      setBusyId(null);
    }
  }

  const submitted = (orderStatus: string) => ['detail_tobepaid', 'deep_insights_tobepaid'].includes(orderStatus);

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Orders</h1>
      <div style={{ marginBottom: 20 }}>
        <select value={status} onChange={(e) => { const next = e.target.value; setStatus(next); load(undefined, next); }} style={{ background: 'var(--ink-panel)', color: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '8px 10px' }}>
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="detail_tobepaid">detail_tobepaid</option>
          <option value="deep_insights_tobepaid">deep_insights_tobepaid</option>
          <option value="paid">paid</option>
          <option value="failed">failed</option>
          <option value="refunded">refunded</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      <table className="data-table">
        <thead><tr><th>Product</th><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {orders?.map((o) => (
            <tr key={o.id}>
              <td>{o.productCode}</td>
              <td>{o.userEmail || o.userId}</td>
              <td>${(o.amountCents / 100).toFixed(2)} {o.currency}</td>
              <td>{o.channel?.replace(/^qr:/, '') || '-'}</td>
              <td><span className={`tag ${o.status === 'paid' ? 'tag--gold' : ''}`}>{o.status}</span></td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td>
                {submitted(o.status) ? (
                  <div className="table-actions">
                    <button className="btn btn-primary btn-compact" onClick={() => reviewPayment(o.id, 'verify-payment')} disabled={busyId === o.id}>
                      Verify payment
                    </button>
                    <button className="btn btn-ghost btn-compact" onClick={() => reviewPayment(o.id, 'reject-payment')} disabled={busyId === o.id}>
                      Reject payment
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-compact" onClick={() => remove(o.id)}>Remove</button>
                )}
              </td>
            </tr>
          ))}
          {orders && orders.length === 0 && <tr><td colSpan={7} className="form-note">No orders match this filter.</td></tr>}
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
