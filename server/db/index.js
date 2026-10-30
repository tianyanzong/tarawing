/**
 * server/db/index.js — PostgreSQL schema v1 for Tarawing.
 *
 * Single `readings` table (JSONB input/result) replaces the reference
 * project's eight per-tool subtables — Tarawing's nine tools all share the
 * same shape (input → basic result → detailed result → optional AI reading),
 * so one flexible table is a better fit than eight near-identical ones.
 */
'use strict';
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { FAQ_SEED, ARTICLE_SEED } = require('./seed-data');
const {
  DEMO_USER, DEMO_READINGS, DEMO_ORDERS, DEMO_NOTIFICATIONS, DEMO_CONSULTATIONS,
} = require('./demo-seed-data');

const BRAND_NAME = 'Tarawing';
const LEGACY_BRAND_NAME = ['Tara', 'Wing'].join('');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/tarawing',
  max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => logger.error('DB pool error', { err }));

const db = {
  query: (sql, p = []) => pool.query(sql, p),
  one: async (sql, p = []) => { const r = await pool.query(sql, p); return r.rows[0] || null; },
  all: async (sql, p = []) => { const r = await pool.query(sql, p); return r.rows; },
  run: async (sql, p = []) => pool.query(sql, p),
  tx: async (fn) => {
    const client = await pool.connect();
    const scoped = {
      query: (sql, p = []) => client.query(sql, p),
      one: async (sql, p = []) => { const r = await client.query(sql, p); return r.rows[0] || null; },
      all: async (sql, p = []) => { const r = await client.query(sql, p); return r.rows; },
      run: async (sql, p = []) => client.query(sql, p),
    };
    try {
      await client.query('BEGIN');
      const result = await fn(scoped);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  },
};

const id = (prefix) => `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
const now = () => new Date().toISOString();
const closeDb = () => pool.end();

async function dropAll(database = db) {
  logger.warn('DB_REINIT=true — dropping all tables in 3s (Ctrl+C to cancel)');
  await new Promise((r) => setTimeout(r, 3000));
  await database.run(`DROP TABLE IF EXISTS
    audit_logs, faq, articles, notifications, consultations, orders,
    readings, admins, settings, users CASCADE`);
  logger.warn('All tables dropped');
}

async function initSchema(database = db) {
  if (process.env.DB_REINIT === 'true') {
    if (process.env.NODE_ENV === 'production') {
      logger.error('DB_REINIT=true is not allowed in production'); process.exit(1);
    }
    await dropAll(database);
  }

  await database.run(`CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'normal', -- normal|banned_temp|banned_perm
    last_active  TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  )`);

  await database.run(`CREATE TABLE IF NOT EXISTS admins (
    id           TEXT PRIMARY KEY,
    username     TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'admin', -- super|admin
    permissions  TEXT NOT NULL DEFAULT '[]',    -- JSON array of domains
    status       TEXT NOT NULL DEFAULT 'enabled', -- enabled|disabled
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  )`);

  // type: astrology_natal | tarot | playing_cards | lenormand_pair |
  //       holy_triangle | gypsy_cross | hexagram | solomon_star | seven_planets
  // Report pipeline, free -> paid -> paid:
  //   simple_report       — free, generated on demand by a deterministic
  //                         server-side algorithm (server/services/reportService.js)
  //   detailed_report     — same algorithm but deeper; always viewable after
  //                         skip/QR submission, but Deep Insights remains
  //                         locked until an admin verifies payment.
  //   deep_insights_report — paid (tier 'deep_insights'), AI-written; either
  //                         auto-generated on payment (settings.aiMechanism)
  //                         or written/triggered manually by an admin
  await database.run(`CREATE TABLE IF NOT EXISTS readings (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT REFERENCES users(id) ON DELETE CASCADE,
    type                  TEXT NOT NULL,
    question              TEXT,
    status                TEXT NOT NULL DEFAULT 'new', -- new|detail_unpaid|detail_tobepaid|detail_paid
    input_data            JSONB,
    result_basic          JSONB,
    simple_report         TEXT,
    detailed_report       TEXT,
    deep_insights_report  TEXT,
    admin_notes           TEXT,
    share_key             TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  )`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_readings_user ON readings(user_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_readings_type ON readings(type)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_readings_share_key ON readings(share_key)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_readings_user_page ON readings(user_id,created_at DESC,id DESC)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_readings_type_page ON readings(type,created_at DESC,id DESC)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_readings_page ON readings(created_at DESC,id DESC)`);

  await database.run(`CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_id     TEXT REFERENCES readings(id) ON DELETE SET NULL,
    product_code   TEXT NOT NULL,
    amount_cents   INTEGER NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'USD',
    channel        TEXT,            -- qr:<payment-method-id>|future gateway
    status         TEXT NOT NULL DEFAULT 'pending', -- pending|paid|failed|refunded|cancelled
    deleted        BOOLEAN NOT NULL DEFAULT false,
    paid_at        TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  )`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_orders_user_page ON orders(user_id,created_at DESC,id DESC)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_orders_page ON orders(deleted,created_at DESC,id DESC)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_orders_status_page ON orders(deleted,status,created_at DESC,id DESC)`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_users_page ON users(created_at DESC,id DESC)`);

  // Preserve existing purchases while moving the old binary unlock state to
  // the explicit unpaid / payment-verification / paid state machine.
  await database.run(`
    UPDATE readings SET status='detail_paid'
    WHERE status='detail_unlocked'
      AND EXISTS (
        SELECT 1 FROM orders
        WHERE orders.reading_id=readings.id
          AND orders.product_code LIKE 'detail_%'
          AND orders.status='paid'
      )
  `);
  await database.run(`
    UPDATE readings SET status='detail_unpaid'
    WHERE status='detail_unlocked'
  `);

  await database.run(`CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TEXT NOT NULL
  )`);
  await database.run(`CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)`);

  await database.run(`CREATE TABLE IF NOT EXISTS consultations (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    name        TEXT,
    contact     TEXT,
    question    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open', -- open|answered|closed
    admin_reply TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`);

  await database.run(`CREATE TABLE IF NOT EXISTS articles (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL,
    body        TEXT NOT NULL,
    published   BOOLEAN NOT NULL DEFAULT true,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`);

  await database.run(`CREATE TABLE IF NOT EXISTS faq (
    id          TEXT PRIMARY KEY,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    published   BOOLEAN NOT NULL DEFAULT true,
    created_at  TEXT NOT NULL
  )`);

  await database.run(`CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TEXT NOT NULL
  )`);

  await database.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    admin_id    TEXT,
    admin_name  TEXT,
    action      TEXT NOT NULL,
    target      TEXT,
    meta        JSONB,
    created_at  TEXT NOT NULL
  )`);

  logger.info('DB schema v1 ready');
}

async function ensureSuperAdmin(database = db) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const existing = await database.one('SELECT id FROM admins WHERE username=$1', [username]);
  if (existing) return;
  const password = process.env.ADMIN_TOKEN || 'tarawing-admin-2026';
  const hash = await bcrypt.hash(password, 10);
  await database.run(
    `INSERT INTO admins (id, username, password, role, permissions, status, created_at, updated_at)
     VALUES ($1,$2,$3,'super',$4,'enabled',$5,$5)`,
    [id('adm'), username, hash, JSON.stringify(['users', 'orders', 'readings', 'consults', 'settings', 'content']), now()]
  );
  logger.info('Super admin created', { username });
}

async function seedDemoData(database = db) {
  await database.run('DELETE FROM readings WHERE id=$1', ['demo_rd_lenormand_crossroad']);

  let user = await database.one('SELECT id FROM users WHERE email=$1', [DEMO_USER.email]);
  if (!user) {
    const hash = await bcrypt.hash(DEMO_USER.password, 10);
    user = { id: id('usr') };
    await database.run(
      `INSERT INTO users (id,name,email,password,role,created_at,updated_at)
       VALUES ($1,$2,$3,$4,'normal',$5,$5)`,
      [user.id, DEMO_USER.name, DEMO_USER.email, hash, now()]
    );
  }

  for (const reading of DEMO_READINGS) {
    await database.run(
      `INSERT INTO readings
       (id,user_id,type,question,status,input_data,result_basic,simple_report,detailed_report,deep_insights_report,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
       ON CONFLICT (id) DO NOTHING`,
      [
        reading.id, user.id, reading.type, reading.question, reading.status,
        JSON.stringify(reading.inputData), JSON.stringify(reading.resultBasic),
        reading.simpleReport, reading.detailedReport, reading.deepInsightsReport, reading.createdAt,
      ]
    );
  }

  for (const order of DEMO_ORDERS) {
    await database.run(
      `INSERT INTO orders
       (id,user_id,reading_id,product_code,amount_cents,currency,channel,status,paid_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,'USD',$6,$7,$8,$9,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        order.id, user.id, order.readingId, order.productCode, order.amountCents,
        order.channel, order.status, order.paidAt, order.createdAt,
      ]
    );
  }

  for (const notice of DEMO_NOTIFICATIONS) {
    await database.run(
      `INSERT INTO notifications (id,user_id,type,message,is_read,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [notice.id, user.id, notice.type, notice.message, notice.isRead, notice.createdAt]
    );
  }

  for (const consultation of DEMO_CONSULTATIONS) {
    await database.run(
      `INSERT INTO consultations
       (id,user_id,name,contact,question,status,admin_reply,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
       ON CONFLICT (id) DO NOTHING`,
      [
        consultation.id, user.id, consultation.name, consultation.contact,
        consultation.question, consultation.status, consultation.adminReply, consultation.createdAt,
      ]
    );
  }

  logger.info('Demo data ensured', { email: DEMO_USER.email, password: DEMO_USER.password });
}

async function seedFaq(database = db) {
  const count = await database.one('SELECT COUNT(*)::int AS c FROM faq');
  if (count && count.c > 0) return;
  for (const f of FAQ_SEED) {
    await database.run(
      `INSERT INTO faq (id,question,answer,category,sort_order,published,created_at) VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [id('faq'), f.q, f.a, f.category, f.order, now()]
    );
  }
  logger.info('FAQ seeded', { count: FAQ_SEED.length });
}

async function seedArticles(database = db) {
  const count = await database.one('SELECT COUNT(*)::int AS c FROM articles');
  if (count && count.c > 0) return;
  for (const a of ARTICLE_SEED) {
    await database.run(
      `INSERT INTO articles (id,title,slug,category,body,published,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,true,$6,$6)`,
      [id('art'), a.title, a.slug, a.category, a.body, now()]
    );
  }
  logger.info('Articles seeded', { count: ARTICLE_SEED.length });
}

async function seedSettings(database = db) {
  const existing = await database.one(`SELECT value FROM settings WHERE key='site'`);
  if (existing) {
    const normalized = JSON.stringify(existing.value).replaceAll(LEGACY_BRAND_NAME, BRAND_NAME);
    const value = JSON.parse(normalized);
    value.aiMechanism = {
      autoGenerateOnPayment: value.aiMechanism?.autoGenerateOnPayment !== false,
      endpoints: Array.isArray(value.aiMechanism?.endpoints) ? value.aiMechanism.endpoints : [],
    };
    value.paymentMethods = Array.isArray(value.paymentMethods) ? value.paymentMethods : [];
    const next = JSON.stringify(value);
    if (next !== JSON.stringify(existing.value)) {
      await database.run(
        `UPDATE settings SET value=$1, updated_at=$2 WHERE key='site'`,
        [next, now()],
      );
      logger.info('Normalized site settings');
    }
    return;
  }
  await database.run(`INSERT INTO settings (key,value,updated_at) VALUES ('site',$1,$2)`, [
    JSON.stringify({
      siteName: BRAND_NAME,
      tagline: 'Read the Cosmos. Find Your Path.',
      donationEnabled: true,
      donationMessage: 'If this reading resonated with you, Tarawing runs on free will and free coffee. Any support keeps the lights (and the stars) on.',
      supportEmail: 'support@tarawing.app',
      // Per-category pricing (cents) for the two paid report tiers.
      // Categories: tarot (single draws), astrology (natal chart + seven
      // planets), spreads (the Sacred Layout Engine). Admin-editable at
      // /admin/settings.
      pricing: {
        tarot: { detail: 299, deepInsights: 499 },
        astrology: { detail: 599, deepInsights: 999 },
        spreads: { detail: 399, deepInsights: 599 },
      },
      // Whether a paid Deep Insights order auto-generates its AI report the
      // moment payment completes, or waits for an admin to generate/write
      // it manually from the admin portal's Deep Insights queue.
      aiMechanism: {
        autoGenerateOnPayment: true,
        endpoints: [],
      },
      paymentMethods: [],
    }),
    now(),
  ]);
  logger.info('Settings seeded');
}

async function normalizeBrandText(database = db) {
  for (const table of ['faq', 'articles', 'notifications']) {
    const columns = table === 'faq' ? ['question', 'answer']
      : table === 'articles' ? ['title', 'body']
        : ['message'];
    const assignments = columns.map((column) => `${column}=REPLACE(${column},$1,$2)`).join(',');
    const predicate = columns.map((column) => `POSITION($1 IN ${column}) > 0`).join(' OR ');
    await database.run(
      `UPDATE ${table} SET ${assignments} WHERE ${predicate}`,
      [LEGACY_BRAND_NAME, BRAND_NAME],
    );
  }
}

module.exports = {
  db, closeDb, dropAll, initSchema, ensureSuperAdmin, seedDemoData, seedFaq,
  seedArticles, seedSettings, normalizeBrandText, id, now,
};
