/**
 * server/middlewares/auth.js
 * requireUser/requireActive/optAuth  — end-user JWT auth.
 * requireAdmin/requirePerm            — admin JWT + permission-domain RBAC.
 * authRateLimit                       — per-IP + per-email limiter on auth endpoints.
 */
'use strict';
const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'tarawing-secret-change-in-production';
const ADMIN_PERMS = ['users', 'orders', 'readings', 'consults', 'settings', 'content'];
const now = () => new Date().toISOString();

function parsePerms(raw) {
  try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a.filter((x) => ADMIN_PERMS.includes(x)) : []; }
  catch { return []; }
}

function signUserToken(user) {
  return jwt.sign({ kind: 'user', id: user.id }, JWT_SECRET, { expiresIn: '30d' });
}
function signAdminToken(admin) {
  return jwt.sign({ kind: 'admin', id: admin.id, username: admin.username, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });
}

async function requireUser(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return res.status(401).json({ error: 'Please sign in first.' });
  try {
    const d = jwt.verify(t, JWT_SECRET);
    if (d.kind !== 'user') throw new Error('wrong kind');
    const u = await db.one('SELECT * FROM users WHERE id=$1', [d.id]);
    if (!u) return res.status(401).json({ error: 'Account not found.' });
    req.user = u;
    next();
  } catch { res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); }
}

async function requireActive(req, res, next) {
  await requireUser(req, res, async () => {
    if (['banned_temp', 'banned_perm'].includes(req.user.role)) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
    await db.run('UPDATE users SET last_active=$1 WHERE id=$2', [now(), req.user.id]);
    next();
  });
}

async function optAuth(req, _res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (t) {
    try {
      const d = jwt.verify(t, JWT_SECRET);
      if (d.kind === 'user') {
        const u = await db.one('SELECT id FROM users WHERE id=$1', [d.id]);
        if (u) req.uid = d.id;
      }
    } catch { /* not logged in — fine, this route is optional */ }
  }
  next();
}

async function resolveAdmin(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  try {
    const d = jwt.verify(t, JWT_SECRET);
    if (d.kind !== 'admin') return null;
    const row = await db.one('SELECT * FROM admins WHERE id=$1', [d.id]);
    if (!row || row.status !== 'enabled') return null;
    return { id: row.id, username: row.username, role: row.role, permissions: parsePerms(row.permissions), isSuper: row.role === 'super' };
  } catch { return null; }
}

function requireAdmin(req, res, next) {
  resolveAdmin(req).then((a) => {
    if (!a) return res.status(401).json({ error: 'Admin authentication required.' });
    req.admin = a;
    next();
  }).catch(() => res.status(401).json({ error: 'Admin authentication required.' }));
}

function requirePerm(domain) {
  const domains = Array.isArray(domain) ? domain : [domain];
  return (req, res, next) => requireAdmin(req, res, () => {
    const a = req.admin;
    if (a.isSuper || domains.some((d) => a.permissions.includes(d))) return next();
    return res.status(403).json({ error: 'Insufficient permissions for this module.' });
  });
}

function requireSuper(req, res, next) {
  requireAdmin(req, res, () => {
    if (!req.admin.isSuper) return res.status(403).json({ error: 'Super admin only.' });
    next();
  });
}

// Minimal in-memory rate limiter — fine for a single-instance deployment;
// swap for a Redis-backed limiter behind a load balancer.
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || t > b.resetAt) { buckets.set(key, { count: 1, resetAt: t + windowMs }); return true; }
  if (b.count >= max) return false;
  b.count++;
  return true;
}
setInterval(() => {
  const t = Date.now();
  for (const [k, b] of buckets) if (t > b.resetAt) buckets.delete(k);
}, 10 * 60 * 1000);

function authRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!rateLimit(`ip:${ip}`, 20, 15 * 60 * 1000) || (email && !rateLimit(`email:${email}`, 8, 15 * 60 * 1000))) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  }
  next();
}

module.exports = {
  signUserToken, signAdminToken, requireUser, requireActive, optAuth,
  requireAdmin, requirePerm, requireSuper, resolveAdmin, authRateLimit, parsePerms, ADMIN_PERMS,
};
