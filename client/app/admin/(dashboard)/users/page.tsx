'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { AdminUser, CursorPage, FreeformTemplate, SiteSettings } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<AdminUser | null>(null);
  const [freeformTemplates, setFreeformTemplates] = useState<FreeformTemplate[]>([]);
  const [contactTemplateId, setContactTemplateId] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);

  async function load(cursor?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (cursor) params.set('cursor', cursor);
      const page = await api.get<CursorPage<AdminUser>>(`/api/admin/users?${params}`, true);
      setUsers((current) => cursor ? [...(current || []), ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setRole(id: string, role: string) {
    await api.post(`/api/admin/users/${id}/role`, { role }, true);
    load();
  }
  async function remove(id: string) {
    if (!confirm('Delete this user and all their readings/orders?')) return;
    await api.del(`/api/admin/users/${id}`, true);
    load();
  }

  async function openContact(user: AdminUser) {
    setContactTarget(user);
    setContactTemplateId('');
    setContactSubject('');
    setContactBody('');
    setContactError(null);
    setContactSent(false);
    try {
      const settings = await api.get<SiteSettings>('/api/admin/settings', true);
      setFreeformTemplates(settings.freeformTemplates);
    } catch (e) {
      setContactError(e instanceof ApiError ? e.message : 'Could not load free templates.');
    }
  }

  function chooseFreeformTemplate(templateId: string) {
    setContactTemplateId(templateId);
    const template = freeformTemplates.find((item) => item.id === templateId);
    setContactSubject(template?.subject || '');
    setContactBody(template?.body || '');
    setContactSent(false);
  }

  async function sendContactEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!contactTarget) return;
    setContactError(null);
    setContactSent(false);
    setContactBusy(true);
    try {
      await api.post(
        `/api/admin/users/${contactTarget.id}/contact`,
        { subject: contactSubject, body: contactBody },
        true,
      );
      setContactSent(true);
    } catch (e) {
      setContactError(e instanceof ApiError ? e.message : 'Could not send the contact email.');
    } finally {
      setContactBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Users</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          placeholder="Search name or email"
          style={{ background: 'var(--ink-panel)', border: '1px solid var(--hairline)', color: 'var(--parchment)', padding: '9px 12px', borderRadius: 3, flex: 1 }}
        />
        <button className="btn btn-ghost" onClick={() => load()} disabled={loading}>Search</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last active</th><th></th></tr></thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} style={{ background: 'var(--ink-panel)', color: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 3, padding: '4px 6px' }}>
                  <option value="normal">normal</option>
                  <option value="banned_temp">banned_temp</option>
                  <option value="banned_perm">banned_perm</option>
                </select>
              </td>
              <td>{u.lastActive ? new Date(u.lastActive).toLocaleString() : '—'}</td>
              <td>
                <div className="table-actions">
                  <button className="btn btn-ghost" onClick={() => remove(u.id)}>Delete</button>
                  <button className="btn btn-ghost" onClick={() => openContact(u)}>Contact</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextCursor && (
        <button className="btn btn-ghost" onClick={() => load(nextCursor)} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Loading…' : 'Load more users'}
        </button>
      )}

      {contactTarget && (
        <div
          className="payment-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setContactTarget(null);
          }}
        >
          <div className="payment-dialog contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-user-title">
            <div className="payment-dialog__heading">
              <div>
                <p className="workspace-header__eyebrow">Contact user</p>
                <h2 id="contact-user-title" style={{ fontSize: 22 }}>{contactTarget.name}</h2>
                <p className="form-note">{contactTarget.email}</p>
              </div>
              <button className="btn btn-ghost btn-compact" onClick={() => setContactTarget(null)}>Close</button>
            </div>

            {contactSent ? (
              <>
                <p className="form-success">Email sent to {contactTarget.email}.</p>
                <div className="payment-dialog__actions">
                  <button className="btn btn-primary" onClick={() => setContactTarget(null)}>Done</button>
                </div>
              </>
            ) : (
              <form onSubmit={sendContactEmail}>
                <div className="form-field">
                  <label htmlFor="contact-template">Free template</label>
                  <select
                    id="contact-template"
                    value={contactTemplateId}
                    onChange={(event) => chooseFreeformTemplate(event.target.value)}
                  >
                    <option value="">Manual email</option>
                    {freeformTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="contact-subject">Email subject</label>
                  <input
                    id="contact-subject"
                    required
                    maxLength={200}
                    value={contactSubject}
                    onChange={(event) => {
                      setContactTemplateId('');
                      setContactSubject(event.target.value);
                    }}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="contact-body">Message</label>
                  <textarea
                    id="contact-body"
                    required
                    rows={10}
                    maxLength={20_000}
                    value={contactBody}
                    onChange={(event) => {
                      setContactTemplateId('');
                      setContactBody(event.target.value);
                    }}
                  />
                </div>
                {contactError && <p className="form-error">{contactError}</p>}
                <div className="payment-dialog__actions">
                  <button className="btn btn-ghost" type="button" onClick={() => setContactTarget(null)}>Cancel</button>
                  <button className="btn btn-primary" type="submit" disabled={contactBusy}>
                    {contactBusy ? 'Sending...' : 'Send email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
