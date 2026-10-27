// lib/api.ts — thin fetch wrapper. In dev, next.config.js rewrites /api/*
// to the Express server; in production set NEXT_PUBLIC_API_BASE to your
// deployed API origin (e.g. https://api.tarawing.app) and requests become
// absolute URLs instead.
import { getAdminToken, getUserToken } from './authStorage';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, opts: RequestInit = {}, useAdmin = false): Promise<T> {
  const t = useAdmin ? getAdminToken() : getUserToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || `Request failed (${res.status})`, res.status, body.details);
  return body.data as T;
}

export const api = {
  get: <T>(path: string, admin = false) => request<T>(path, { method: 'GET' }, admin),
  post: <T>(path: string, body?: unknown, admin = false) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, admin),
  put: <T>(path: string, body?: unknown, admin = false) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }, admin),
  del: <T>(path: string, admin = false) => request<T>(path, { method: 'DELETE' }, admin),
};

/** Downloads a binary response (e.g. the PDF export) and triggers a save-as. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const t = getUserToken();
  const headers: Record<string, string> = {};
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Download failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
