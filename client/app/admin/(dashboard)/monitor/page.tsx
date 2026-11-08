'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { MonitorLog, MonitorResult } from '@/lib/types';

function localDayStart(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : '';
}

function localDayEndExclusive(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function eventLabel(value: string) {
  return value.replaceAll('.', ' / ').replaceAll('_', ' ');
}

function logLevel(log: MonitorLog) {
  return String(log.meta?.level || (log.action.endsWith('.error') ? 'error' : 'info'));
}

export default function MonitorPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventType, setEventType] = useState('');
  const [logs, setLogs] = useState<MonitorLog[] | null>(null);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (from) params.set('from', localDayStart(from));
      if (to) params.set('to', localDayEndExclusive(to));
      if (eventType) params.set('eventType', eventType);
      const result = await api.get<MonitorResult>(`/api/admin/monitor?${params}`, true);
      setLogs(result.items);
      setEventTypes(result.eventTypes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load monitor logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Monitor</h1>
      <p className="form-note" style={{ marginBottom: 20 }}>
        Recent administrative events and system errors, including email delivery failures.
      </p>

      <form
        className="monitor-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <div className="form-field">
          <label htmlFor="monitor-from">From date</label>
          <input id="monitor-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="monitor-to">To date</label>
          <input id="monitor-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <div className="form-field monitor-event-filter">
          <label htmlFor="monitor-event-type">Event type</label>
          <select id="monitor-event-type" value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="">All event types</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>{eventLabel(type)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Time</th><th>Level</th><th>Event type</th><th>Message</th><th>Actor</th><th>Target</th></tr>
          </thead>
          <tbody>
            {logs?.map((log) => {
              const level = logLevel(log);
              return (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td><span className={`tag ${level === 'error' ? 'tag--error' : 'tag--sky'}`}>{level}</span></td>
                  <td>{eventLabel(log.action)}</td>
                  <td className="monitor-message">{String(log.meta?.message || 'No message')}</td>
                  <td>{log.adminName || 'System'}</td>
                  <td>{log.target || '—'}</td>
                </tr>
              );
            })}
            {logs && logs.length === 0 && (
              <tr><td colSpan={6} className="form-note">No logs match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
