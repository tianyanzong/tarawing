/**
 * server/server.js — Tarawing API. Express + PostgreSQL.
 * Mirrors the route-and-permission architecture of the reference project
 * (tianyan) — JWT user auth, admin RBAC over permission domains, a JSONB
 * "readings" table standing in for its per-tool report subtables, and a
 * sandbox-first order/payment state machine — adapted to an
 * astrology/tarot domain and written in English throughout.
 */
'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const { logger, httpLogger } = require('./utils/logger');
const {
  db, initSchema, ensureSuperAdmin, seedDemoData, seedFaq, seedArticles,
  seedSettings, normalizeBrandText, id, now,
} = require('./db');
const {
  signUserToken, signAdminToken, requireUser, requireActive, optAuth,
  requireAdmin, requirePerm, requireSuper, authRateLimit, parsePerms,
} = require('./middlewares/auth');
const { validate } = require('./middlewares/validate');
const { S } = require('./schemas');
const { drawCards, drawSpread } = require('./services/cardService');
const { computeNatalChart } = require('./services/astrologyService');
const { generateAiReading } = require('./services/aiReading');
const { generateSimpleReport, generateDetailedReport } = require('./services/reportService');
const { renderReportPdf } = require('./services/pdfService');
const {
  TIERS, resolvePriceCents, getAiMechanismSettings, simulateSandboxPayment,
} = require('./services/paymentService');
const { SPREADS } = require('./data/spreads');
const { categoryOf, CATEGORIES } = require('./data/categories');
const { parsePagination } = require('./utils/pagination');
const { dtoResponse } = require('./utils/dto');
const {
  listAdminOrders, listAdminReadings, listAdminUsers, listUserOrders, listUserReadings,
} = require('./repositories/lists');

// ── Production startup guard ─────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const placeholderJwt = !process.env.JWT_SECRET || process.env.JWT_SECRET.includes('CHANGE');
  const placeholderAdmin = !process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.includes('CHANGE');
  if (placeholderJwt) { logger.error('Production requires a real JWT_SECRET'); process.exit(1); }
  if (placeholderAdmin) { logger.error('Production requires a real ADMIN_TOKEN'); process.exit(1); }
  if (process.env.DB_REINIT === 'true') { logger.error('DB_REINIT=true is not allowed in production'); process.exit(1); }
}

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);
app.use(dtoResponse);

const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next); // async handler wrapper

/**
 * Fetch a reading the given user is allowed to act on — either they
 * already own it, or it was an anonymous draw (user_id IS NULL, allowed
 * since drawing never requires login) and this is the first authenticated
 * action on it, in which case we claim it for them right here. Without
 * this, an anonymous draw could never be upgraded to a report after
 * signing in, because a plain `WHERE user_id=$2` can never match NULL.
 */
async function claimAndFetchReading(readingId, userId) {
  const r = await db.one('SELECT * FROM readings WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)', [readingId, userId]);
  if (r && !r.user_id) {
    await db.run('UPDATE readings SET user_id=$1, updated_at=$2 WHERE id=$3', [userId, now(), readingId]);
    r.user_id = userId;
  }
  return r;
}

// ══════════════════════════ AUTH ══════════════════════════
app.post('/api/auth/register', authRateLimit, validate(S.register), ah(async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await db.one('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
  const hash = await bcrypt.hash(password, 10);
  const uid = id('usr');
  const t = now();
  await db.run('INSERT INTO users (id,name,email,password,role,created_at,updated_at) VALUES ($1,$2,$3,$4,\'normal\',$5,$5)',
    [uid, name, email.toLowerCase(), hash, t]);
  const user = await db.one('SELECT id,name,email,role,created_at FROM users WHERE id=$1', [uid]);
  res.status(201).json({ data: { user, token: signUserToken(user) } });
}));

app.post('/api/auth/login', authRateLimit, validate(S.login), ah(async (req, res) => {
  const { email, password } = req.body;
  const u = await db.one('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  if (!u || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ error: 'Incorrect email or password.' });
  if (['banned_temp', 'banned_perm'].includes(u.role)) return res.status(403).json({ error: 'This account has been suspended.' });
  await db.run('UPDATE users SET last_active=$1 WHERE id=$2', [now(), u.id]);
  const { password: _pw, ...safe } = u;
  res.json({ data: { user: safe, token: signUserToken(u) } });
}));

app.get('/api/auth/me', requireUser, ah(async (req, res) => {
  const { password: _pw, ...safe } = req.user;
  res.json({ data: safe });
}));

app.put('/api/auth/me', requireActive, validate(S.updateProfile), ah(async (req, res) => {
  const { name, email } = req.body;
  if (!name && !email) return res.status(400).json({ error: 'Nothing to update.' });
  if (email && email.toLowerCase() !== req.user.email) {
    const existing = await db.one('SELECT id FROM users WHERE email=$1 AND id<>$2', [email.toLowerCase(), req.user.id]);
    if (existing) return res.status(409).json({ error: 'That email is already in use by another account.' });
  }
  const t = now();
  await db.run(
    'UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), updated_at=$3 WHERE id=$4',
    [name || null, email ? email.toLowerCase() : null, t, req.user.id]
  );
  const updated = await db.one('SELECT id,name,email,role,created_at FROM users WHERE id=$1', [req.user.id]);
  res.json({ data: updated });
}));

app.post('/api/auth/change-password', requireActive, validate(S.changePassword), ah(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ok = await bcrypt.compare(currentPassword, req.user.password);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
  const hash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password=$1, updated_at=$2 WHERE id=$3', [hash, now(), req.user.id]);
  res.json({ data: { ok: true } });
}));

// ══════════════════════════ READINGS ══════════════════════════
// Free basic draw/chart, no login required. Login required for the report
// pipeline (free simple report -> paid detailed report -> paid Deep
// Insights report).
app.post('/api/readings', optAuth, validate(S.createReading), ah(async (req, res) => {
  const body = req.body;
  let resultBasic;

  if (body.type === 'astrology_natal') {
    if (!body.birthDate) return res.status(400).json({ error: 'birthDate is required for a natal chart.' });
    resultBasic = computeNatalChart(body);
  } else if (Object.keys(SPREADS).includes(body.type)) {
    resultBasic = drawSpread(body.type); // deck is fixed per spread server-side, see cardService.SPREAD_DECK
  } else if (['tarot', 'playing_cards'].includes(body.type)) {
    // Single-card / free-form draw of the named deck (default 1 card).
    resultBasic = { deck: body.type, cards: drawCards(body.type, 1).map((card) => ({ position: 'Draw', card })) };
  } else {
    return res.status(400).json({ error: 'Unsupported reading type.' });
  }

  const readingId = id('rd');
  const t = now();
  await db.run(
    `INSERT INTO readings (id,user_id,type,question,status,input_data,result_basic,created_at,updated_at)
     VALUES ($1,$2,$3,$4,'new',$5,$6,$7,$7)`,
    [readingId, req.uid || null, body.type, body.question || null, JSON.stringify(body), JSON.stringify(resultBasic), t]
  );
  res.status(201).json({ data: { id: readingId, type: body.type, question: body.question || null, resultBasic, createdAt: t } });
}));

app.get('/api/readings', requireActive, ah(async (req, res) => {
  const page = parsePagination(req.query);
  if (page.error) return res.status(400).json({ error: page.error });

  const result = await listUserReadings(db, req.user.id, page.limit, page.cursor);
  result.items = result.items.map((r) => ({ ...r, category: categoryOf(r.type) }));
  res.json({ data: result });
}));

/**
 * The single "access summary" view the whole report pipeline UI is built
 * on: what's free (simpleReport), what's paid-and-unlocked (detailedReport),
 * and where the Deep Insights order stands (ordered/paid/ready/pending),
 * plus the live price for each tier so the client never hardcodes money.
 */
async function buildReadingView(r, forUserId) {
  const category = categoryOf(r.type);
  const owned = !r.user_id || r.user_id === forUserId;
  const detailedUnlocked = r.status === 'detail_unlocked';

  let deepInsights = { ordered: false, paid: false, ready: !!r.deep_insights_report, pending: false, report: null, orderId: null };
  if (category) {
    const code = `deep_insights_${category}`;
    const order = await db.one(
      'SELECT id, status FROM orders WHERE reading_id=$1 AND product_code=$2 ORDER BY created_at DESC LIMIT 1',
      [r.id, code]
    );
    if (order) {
      const paid = order.status === 'paid';
      deepInsights = {
        ordered: true,
        paid,
        ready: paid && !!r.deep_insights_report,
        pending: paid && !r.deep_insights_report,
        report: paid ? (r.deep_insights_report || null) : null,
        orderId: order.status === 'pending' ? order.id : null,
      };
    }
  }

  const pricing = category ? {
    detailCents: await resolvePriceCents(db, category, 'detail'),
    deepInsightsCents: await resolvePriceCents(db, category, 'deep_insights'),
  } : null;

  return {
    id: r.id, type: r.type, category, question: r.question, status: r.status,
    createdAt: r.created_at, owned,
    resultBasic: owned ? r.result_basic : null,
    simpleReport: owned ? (r.simple_report || null) : null,
    detailedUnlocked, detailedReport: (owned && detailedUnlocked) ? r.detailed_report : null,
    deepInsights: owned ? deepInsights : { ordered: false, paid: false, ready: false, pending: false, report: null, orderId: null },
    pricing,
  };
}

app.get('/api/readings/:id', optAuth, ah(async (req, res) => {
  const r = await db.one('SELECT * FROM readings WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  if (r.user_id && r.user_id !== req.uid) return res.status(403).json({ error: 'You do not have access to this reading.' });
  res.json({ data: await buildReadingView(r, req.uid) });
}));

app.delete('/api/readings/:id', requireActive, ah(async (req, res) => {
  const r = await claimAndFetchReading(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  await db.run('DELETE FROM readings WHERE id=$1', [req.params.id]);
  res.json({ data: { deleted: true } });
}));

// Free tier: a deterministic, non-AI summary. Deliberately open to
// anonymous visitors (no account needed to draw, so none needed to see the
// free report either) — but it's only PERSISTED (and the reading claimed
// for the account) if the caller is actually signed in. An anonymous call
// regenerates the same deterministic text every time rather than erroring,
// so "sign in, then click Generate again" naturally saves it.
app.post('/api/readings/:id/simple-report', optAuth, ah(async (req, res) => {
  const r = await db.one('SELECT * FROM readings WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  if (r.user_id && r.user_id !== req.uid) return res.status(403).json({ error: 'You do not have access to this reading.' });

  if (r.simple_report) return res.json({ data: { simpleReport: r.simple_report, saved: !!r.user_id } });
  const text = generateSimpleReport(r);

  if (req.uid) {
    await db.run('UPDATE readings SET simple_report=$1, user_id=COALESCE(user_id,$2), updated_at=$3 WHERE id=$4', [text, req.uid, now(), r.id]);
    return res.json({ data: { simpleReport: text, saved: true } });
  }
  res.json({ data: { simpleReport: text, saved: false } });
}));

// Paid tier (detail): a nicely-typeset PDF of the detailed report.
app.get('/api/readings/:id/export-pdf', requireActive, ah(async (req, res) => {
  const r = await claimAndFetchReading(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  if (r.status !== 'detail_unlocked' || !r.detailed_report) {
    return res.status(402).json({ error: 'The detailed report is locked. Unlock it first.' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="tarawing-${r.type}-${r.id}.pdf"`);
  renderReportPdf(r, categoryOf(r.type)).pipe(res);
}));

app.post('/api/readings/:id/share', requireActive, ah(async (req, res) => {
  const r = await claimAndFetchReading(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  const key = r.share_key || id('shr');
  await db.run('UPDATE readings SET share_key=$1 WHERE id=$2', [key, r.id]);
  res.json({ data: { shareKey: key } });
}));

// Shared links only ever expose free content (the draw itself + the free
// simple report) — paid tiers are never reachable via a share link, even
// if the owner has unlocked them.
app.get('/api/share/:key', ah(async (req, res) => {
  const r = await db.one('SELECT id,type,question,result_basic,simple_report,created_at FROM readings WHERE share_key=$1', [req.params.key]);
  if (!r) return res.status(404).json({ error: 'Shared reading not found.' });
  res.json({ data: r });
}));

// ══════════════════════════ PRICING / ORDERS / PAYMENTS ══════════════════════════
app.get('/api/pricing', ah(async (_req, res) => {
  const row = await db.one("SELECT value FROM settings WHERE key='site'");
  res.json({ data: row?.value?.pricing || {} });
}));

app.get('/api/orders', requireActive, ah(async (req, res) => {
  const page = parsePagination(req.query);
  if (page.error) return res.status(400).json({ error: page.error });

  res.json({ data: await listUserOrders(db, req.user.id, page.limit, page.cursor) });
}));

app.post('/api/orders', requireActive, validate(S.createOrder), ah(async (req, res) => {
  const { readingId, tier } = req.body;
  const reading = await claimAndFetchReading(readingId, req.user.id);
  if (!reading) return res.status(404).json({ error: 'Reading not found.' });
  const category = categoryOf(reading.type);
  if (!category) return res.status(400).json({ error: 'This reading type has no purchasable reports.' });
  if (tier === 'deep_insights' && reading.status !== 'detail_unlocked') {
    return res.status(400).json({ error: 'Unlock the detailed report before ordering Deep Insights.' });
  }
  const amountCents = await resolvePriceCents(db, category, tier);
  const orderId = id('ord');
  const t = now();
  await db.run(
    `INSERT INTO orders (id,user_id,reading_id,product_code,amount_cents,currency,status,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,'USD','pending',$6,$6)`,
    [orderId, req.user.id, readingId, `${tier}_${category}`, amountCents, t]
  );
  res.status(201).json({ data: { id: orderId, amountCents, currency: 'USD', status: 'pending', tier, category } });
}));

app.get('/api/orders/:id', requireActive, ah(async (req, res) => {
  const o = await db.one('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  res.json({ data: o });
}));

app.post('/api/orders/:id/simulate-sandbox-pay', requireActive, ah(async (req, res) => {
  const o = await db.one('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (o.status === 'paid') return res.json({ data: o });
  const sim = simulateSandboxPayment(o);
  const t = now();
  const [tier] = TIERS.filter((tr) => o.product_code.startsWith(`${tr}_`));

  await db.tx(async (tx) => {
    await tx.run('UPDATE orders SET status=$1, paid_at=$2, updated_at=$2, channel=$3 WHERE id=$4', [sim.status, t, 'sandbox', o.id]);

    if (o.reading_id && tier === 'detail') {
      const reading = await tx.one('SELECT * FROM readings WHERE id=$1', [o.reading_id]);
      const detailedText = generateDetailedReport(reading);
      await tx.run('UPDATE readings SET status=\'detail_unlocked\', detailed_report=$1, updated_at=$2 WHERE id=$3', [detailedText, t, o.reading_id]);
      await tx.run('INSERT INTO notifications (id,user_id,type,message,created_at) VALUES ($1,$2,\'payment\',$3,$4)',
        [id('ntf'), req.user.id, 'Your payment was received — the detailed report is now unlocked.', t]);
    }

    if (o.reading_id && tier === 'deep_insights') {
      const ai = await getAiMechanismSettings(tx);
      if (ai.autoGenerateOnPayment) {
        const reading = await tx.one('SELECT * FROM readings WHERE id=$1', [o.reading_id]);
        const basic = reading.result_basic;
        const gen = await generateAiReading({ type: reading.type, question: reading.question, cards: basic?.cards, chart: reading.type === 'astrology_natal' ? basic : null });
        if (gen.ok) {
          await tx.run('UPDATE readings SET deep_insights_report=$1, updated_at=$2 WHERE id=$3', [gen.text, t, o.reading_id]);
          await tx.run('INSERT INTO notifications (id,user_id,type,message,created_at) VALUES ($1,$2,\'payment\',$3,$4)',
            [id('ntf'), req.user.id, 'Your Deep Insights report is ready.', t]);
        } else {
          // AI call failed (e.g. no API key configured) — leave it pending
          // for an admin to generate or write manually; don't fail the payment.
          logger.error('Auto Deep Insights generation failed after payment', { readingId: o.reading_id, error: gen.error });
          await tx.run('INSERT INTO notifications (id,user_id,type,message,created_at) VALUES ($1,$2,\'payment\',$3,$4)',
            [id('ntf'), req.user.id, 'Your payment was received — your Deep Insights report is being prepared and will be ready soon.', t]);
        }
      } else {
        await tx.run('INSERT INTO notifications (id,user_id,type,message,created_at) VALUES ($1,$2,\'payment\',$3,$4)',
          [id('ntf'), req.user.id, 'Your payment was received — your Deep Insights report is being prepared by our team and will be ready soon.', t]);
      }
    }
  });

  const updated = await db.one('SELECT * FROM orders WHERE id=$1', [o.id]);
  res.json({ data: updated });
}));

// TODO(live): real gateway webhook verification per channel.
app.post('/api/payments/notify/:channel', ah(async (_req, res) => {
  res.status(501).json({ error: `Live payment channel "${_req.params.channel}" is not configured. Use PAYMENT_MODE=sandbox in development.` });
}));

app.post('/api/orders/:id/refund', requireActive, ah(async (req, res) => {
  const o = await db.one('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  if (o.status !== 'paid') return res.status(400).json({ error: 'Only paid orders can be refunded.' });
  await db.run('UPDATE orders SET status=\'refunded\', updated_at=$1 WHERE id=$2', [now(), o.id]);
  res.json({ data: { refunded: true } });
}));

// ══════════════════════════ NOTIFICATIONS ══════════════════════════
app.get('/api/notifications', requireActive, ah(async (req, res) => {
  const rows = await db.all('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  res.json({ data: rows });
}));
app.get('/api/notifications/unread-count', requireActive, ah(async (req, res) => {
  const r = await db.one('SELECT COUNT(*)::int AS c FROM notifications WHERE user_id=$1 AND is_read=false', [req.user.id]);
  res.json({ data: { count: r.c } });
}));
app.post('/api/notifications/:id/read', requireActive, ah(async (req, res) => {
  await db.run('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ data: { ok: true } });
}));

// ══════════════════════════ CONSULTATIONS (contact / ask-an-astrologer) ══════════════════════════
app.post('/api/consultations', optAuth, validate(S.createConsult), ah(async (req, res) => {
  const t = now();
  const cid = id('cns');
  await db.run(
    `INSERT INTO consultations (id,user_id,name,contact,question,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'open',$6,$6)`,
    [cid, req.uid || null, req.body.name || null, req.body.contact || null, req.body.question, t]
  );
  res.status(201).json({ data: { id: cid } });
}));
app.get('/api/consultations', requireUser, ah(async (req, res) => {
  const rows = await db.all('SELECT * FROM consultations WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ data: rows });
}));

// ══════════════════════════ PUBLIC CONTENT ══════════════════════════
app.get('/api/library', ah(async (_req, res) => {
  const rows = await db.all('SELECT id,title,slug,category,created_at FROM articles WHERE published=true ORDER BY created_at DESC');
  res.json({ data: rows });
}));
app.get('/api/library/:slug', ah(async (req, res) => {
  const row = await db.one('SELECT * FROM articles WHERE slug=$1 AND published=true', [req.params.slug]);
  if (!row) return res.status(404).json({ error: 'Article not found.' });
  res.json({ data: row });
}));
app.get('/api/faq', ah(async (_req, res) => {
  const rows = await db.all('SELECT id,question,answer,category FROM faq WHERE published=true ORDER BY sort_order ASC');
  res.json({ data: rows });
}));
app.get('/api/settings', ah(async (_req, res) => {
  const row = await db.one("SELECT value FROM settings WHERE key='site'");
  res.json({ data: row ? row.value : {} });
}));

// ══════════════════════════ ADMIN ══════════════════════════
app.post('/api/admin/login', authRateLimit, validate(S.adminLogin), ah(async (req, res) => {
  const { username, password } = req.body;
  const a = await db.one('SELECT * FROM admins WHERE username=$1', [username]);
  if (!a || a.status !== 'enabled' || !(await bcrypt.compare(password, a.password))) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  res.json({ data: { token: signAdminToken(a), username: a.username, role: a.role } });
}));

app.get('/api/admin/me', requireAdmin, ah(async (req, res) => res.json({ data: req.admin })));

app.get('/api/admin/admins', requireSuper, ah(async (_req, res) => {
  const rows = await db.all('SELECT id,username,role,permissions,status,created_at FROM admins ORDER BY created_at ASC');
  res.json({
    data: rows.map((row) => ({ ...row, permissions: parsePerms(row.permissions) })),
  });
}));
app.post('/api/admin/admins', requireSuper, validate(S.adminCreate), ah(async (req, res) => {
  const { username, password, role, permissions } = req.body;
  const existing = await db.one('SELECT id FROM admins WHERE username=$1', [username]);
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });
  const hash = await bcrypt.hash(password, 10);
  const aid = id('adm');
  const t = now();
  await db.run(
    `INSERT INTO admins (id,username,password,role,permissions,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'enabled',$6,$6)`,
    [aid, username, hash, role, JSON.stringify(permissions), t]
  );
  res.status(201).json({ data: { id: aid, username, role, permissions } });
}));
app.delete('/api/admin/admins/:id', requireSuper, ah(async (req, res) => {
  if (req.params.id === req.admin.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  await db.run('DELETE FROM admins WHERE id=$1', [req.params.id]);
  res.json({ data: { deleted: true } });
}));

app.get('/api/admin/stats', requireAdmin, ah(async (_req, res) => {
  const [users, readings, paidOrders, revenue] = await Promise.all([
    db.one('SELECT COUNT(*)::int AS c FROM users'),
    db.one('SELECT COUNT(*)::int AS c FROM readings'),
    db.one("SELECT COUNT(*)::int AS c FROM orders WHERE status='paid'"),
    db.one("SELECT COALESCE(SUM(amount_cents),0)::int AS s FROM orders WHERE status='paid'"),
  ]);
  const byType = await db.all('SELECT type, COUNT(*)::int AS c FROM readings GROUP BY type ORDER BY c DESC');
  res.json({ data: { totalUsers: users.c, totalReadings: readings.c, paidOrders: paidOrders.c, revenueCents: revenue.s, readingsByType: byType } });
}));

app.get('/api/admin/users', requirePerm('users'), ah(async (req, res) => {
  const page = parsePagination(req.query);
  if (page.error) return res.status(400).json({ error: page.error });

  res.json({
    data: await listAdminUsers(db, {
      q: req.query.q || '',
      limit: page.limit,
      cursor: page.cursor,
    }),
  });
}));
app.post('/api/admin/users/:id/role', requirePerm('users'), ah(async (req, res) => {
  const role = req.body?.role;
  if (!['normal', 'banned_temp', 'banned_perm'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  await db.run('UPDATE users SET role=$1, updated_at=$2 WHERE id=$3', [role, now(), req.params.id]);
  res.json({ data: { ok: true } });
}));
app.delete('/api/admin/users/:id', requirePerm('users'), ah(async (req, res) => {
  await db.run('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ data: { deleted: true } });
}));

app.get('/api/admin/orders', requirePerm('orders'), ah(async (req, res) => {
  const page = parsePagination(req.query);
  if (page.error) return res.status(400).json({ error: page.error });

  res.json({
    data: await listAdminOrders(db, {
      status: req.query.status || '',
      limit: page.limit,
      cursor: page.cursor,
    }),
  });
}));
app.delete('/api/admin/orders/:id', requirePerm('orders'), ah(async (req, res) => {
  await db.run('UPDATE orders SET deleted=true, updated_at=$1 WHERE id=$2', [now(), req.params.id]);
  res.json({ data: { deleted: true } });
}));
app.post('/api/admin/orders/:id/restore', requirePerm('orders'), ah(async (req, res) => {
  await db.run('UPDATE orders SET deleted=false, updated_at=$1 WHERE id=$2', [now(), req.params.id]);
  res.json({ data: { restored: true } });
}));

app.get('/api/admin/readings', requirePerm('readings'), ah(async (req, res) => {
  const page = parsePagination(req.query);
  if (page.error) return res.status(400).json({ error: page.error });

  res.json({
    data: await listAdminReadings(db, {
      type: req.query.type || '',
      limit: page.limit,
      cursor: page.cursor,
    }),
  });
}));
app.get('/api/admin/readings/:id', requirePerm('readings'), ah(async (req, res) => {
  const r = await db.one('SELECT * FROM readings WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  res.json({ data: r });
}));
// Admin queue: paid Deep Insights orders whose report hasn't been written
// yet — either because aiMechanism.autoGenerateOnPayment is off, or a prior
// auto-generation attempt failed (e.g. no ANTHROPIC_API_KEY configured).
app.get('/api/admin/deep-insights-queue', requirePerm(['readings', 'orders']), ah(async (_req, res) => {
  const rows = await db.all(`
    SELECT o.id AS order_id, o.product_code, o.amount_cents, o.paid_at,
           r.id AS reading_id, r.type, r.question, r.created_at AS reading_created_at
    FROM orders o
    JOIN readings r ON r.id = o.reading_id
    WHERE o.product_code LIKE 'deep_insights_%' AND o.status='paid' AND r.deep_insights_report IS NULL
    ORDER BY o.paid_at ASC
  `);
  res.json({ data: rows.map((row) => ({ ...row, category: categoryOf(row.type) })) });
}));

app.post('/api/admin/readings/:id/deep-insights/generate-ai', requirePerm(['readings', 'orders']), ah(async (req, res) => {
  const r = await db.one('SELECT * FROM readings WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  const basic = r.result_basic;
  const gen = await generateAiReading({ type: r.type, question: r.question, cards: basic?.cards, chart: r.type === 'astrology_natal' ? basic : null });
  if (!gen.ok) return res.status(502).json({ error: gen.error });
  await db.run('UPDATE readings SET deep_insights_report=$1, updated_at=$2 WHERE id=$3', [gen.text, now(), r.id]);
  res.json({ data: { deepInsightsReport: gen.text } });
}));
app.post('/api/admin/readings/:id/deep-insights/save-manual', requirePerm(['readings', 'orders']), validate(S.saveAiText), ah(async (req, res) => {
  const r = await db.one('SELECT id, user_id FROM readings WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reading not found.' });
  await db.run('UPDATE readings SET deep_insights_report=$1, updated_at=$2 WHERE id=$3', [req.body.text, now(), r.id]);
  if (r.user_id) {
    await db.run('INSERT INTO notifications (id,user_id,type,message,created_at) VALUES ($1,$2,\'payment\',$3,$4)',
      [id('ntf'), r.user_id, 'Your Deep Insights report is ready.', now()]);
  }
  res.json({ data: { ok: true } });
}));
app.post('/api/admin/readings/:id/notes', requirePerm('readings'), ah(async (req, res) => {
  await db.run('UPDATE readings SET admin_notes=$1, updated_at=$2 WHERE id=$3', [req.body?.notes || '', now(), req.params.id]);
  res.json({ data: { ok: true } });
}));

app.get('/api/admin/consultations', requirePerm('consults'), ah(async (_req, res) => {
  const rows = await db.all('SELECT * FROM consultations ORDER BY created_at DESC LIMIT 200');
  res.json({ data: rows });
}));
app.post('/api/admin/consultations/:id/reply', requirePerm('consults'), ah(async (req, res) => {
  await db.run("UPDATE consultations SET admin_reply=$1, status='answered', updated_at=$2 WHERE id=$3", [req.body?.reply || '', now(), req.params.id]);
  res.json({ data: { ok: true } });
}));

app.get('/api/admin/settings', requirePerm('settings'), ah(async (_req, res) => {
  const row = await db.one("SELECT value FROM settings WHERE key='site'");
  res.json({ data: row ? row.value : {} });
}));
app.put('/api/admin/settings', requirePerm('settings'), validate(S.siteSettings), ah(async (req, res) => {
  await db.run("INSERT INTO settings (key,value,updated_at) VALUES ('site',$1,$2) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=$2", [JSON.stringify(req.body || {}), now()]);
  await db.run('INSERT INTO audit_logs (id,admin_id,admin_name,action,target,meta,created_at) VALUES ($1,$2,$3,\'settings.update\',\'site\',$4,$5)',
    [id('log'), req.admin.id, req.admin.username, JSON.stringify(req.body || {}), now()]);
  res.json({ data: { ok: true } });
}));
app.get('/api/admin/audit-logs', requirePerm('settings'), ah(async (_req, res) => {
  const rows = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
  res.json({ data: rows });
}));

app.get('/api/admin/articles', requirePerm('content'), ah(async (_req, res) => {
  const rows = await db.all('SELECT * FROM articles ORDER BY created_at DESC');
  res.json({ data: rows });
}));
app.post('/api/admin/articles', requirePerm('content'), validate(S.articleSave), ah(async (req, res) => {
  const b = req.body;
  if (b.id) {
    await db.run('UPDATE articles SET title=$1,slug=$2,category=$3,body=$4,published=$5,updated_at=$6 WHERE id=$7',
      [b.title, b.slug, b.category, b.body, b.published, now(), b.id]);
    return res.json({ data: { id: b.id } });
  }
  const aid = id('art');
  const t = now();
  await db.run('INSERT INTO articles (id,title,slug,category,body,published,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)',
    [aid, b.title, b.slug, b.category, b.body, b.published, t]);
  res.status(201).json({ data: { id: aid } });
}));
app.delete('/api/admin/articles/:id', requirePerm('content'), ah(async (req, res) => {
  await db.run('DELETE FROM articles WHERE id=$1', [req.params.id]);
  res.json({ data: { deleted: true } });
}));

app.get('/api/admin/faq', requirePerm('content'), ah(async (_req, res) => {
  const rows = await db.all('SELECT * FROM faq ORDER BY sort_order ASC');
  res.json({ data: rows });
}));
app.post('/api/admin/faq', requirePerm('content'), validate(S.faqSave), ah(async (req, res) => {
  const b = req.body;
  const fid = id('faq');
  await db.run('INSERT INTO faq (id,question,answer,category,sort_order,published,created_at) VALUES ($1,$2,$3,$4,$5,true,$6)',
    [fid, b.question, b.answer, b.category, b.sortOrder, now()]);
  res.status(201).json({ data: { id: fid } });
}));
app.delete('/api/admin/faq/:id', requirePerm('content'), ah(async (req, res) => {
  await db.run('DELETE FROM faq WHERE id=$1', [req.params.id]);
  res.json({ data: { deleted: true } });
}));

// ══════════════════════════ ERROR HANDLING ══════════════════════════
app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { err, reqId: req.reqId, path: req.path });
  res.status(500).json({ error: 'Internal server error.' });
});

// ══════════════════════════ BOOT ══════════════════════════
const PORT = process.env.PORT || 3301;
(async () => {
  await initSchema();
  await ensureSuperAdmin();
  await seedSettings();
  await seedFaq();
  await seedArticles();
  if (process.env.NODE_ENV !== 'production') await seedDemoData();
  await normalizeBrandText();
  app.listen(PORT, () => logger.info(`Tarawing API listening on :${PORT}`));
})().catch((err) => {
  if (err.code === '3D000') {
    logger.error(`Database does not exist yet. Create it first, e.g.: createdb ${process.env.PGDATABASE || '<your DB name from DATABASE_URL>'}`);
  } else if (err.code === 'ECONNREFUSED') {
    logger.error('Could not reach PostgreSQL — is it running? Check DATABASE_URL in server/.env.');
  } else if (err.code === '28P01' || err.code === '28000') {
    logger.error('PostgreSQL rejected the username/password in DATABASE_URL — check server/.env.');
  } else {
    logger.error('Fatal startup error', { err });
  }
  process.exit(1);
});

module.exports = app;
