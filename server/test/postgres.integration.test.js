'use strict';
require('dotenv').config({ quiet: true });

const assert = require('node:assert/strict');
const test = require('node:test');
const { decodeCursor } = require('../utils/pagination');
const { toApiDto } = require('../utils/dto');

const connectionString = process.env.TEST_DATABASE_URL;
const integrationTest = connectionString ? test : test.skip;

integrationTest('demo seed, DTOs, and cursor queries work against PostgreSQL', async (t) => {
  const databaseUrl = new URL(connectionString);
  if (!databaseUrl.pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name ends with _test.');
  }

  const { Client } = require('pg');
  const {
    initSchema, normalizeBrandText, seedArticles, seedDemoData, seedFaq, seedSettings,
  } = require('../db');
  const {
    listAdminOrders, listAdminReadings, listAdminUsers, listUserReadings,
  } = require('../repositories/lists');
  const {
    consumeAuthToken, createAuthToken, hashAuthToken,
  } = require('../services/authTokenService');

  const client = new Client({ connectionString });
  await client.connect();

  const schema = `tarawing_it_${process.pid}_${Date.now()}`;
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query('SELECT set_config($1,$2,false)', ['search_path', schema]);
  t.after(async () => {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  });

  const database = {
    all: async (sql, params = []) => (await client.query(sql, params)).rows,
    one: async (sql, params = []) => (await client.query(sql, params)).rows[0] || null,
    run: (sql, params = []) => client.query(sql, params),
  };

  const previousReinit = process.env.DB_REINIT;
  process.env.DB_REINIT = 'false';
  try {
    await initSchema(database);
  } finally {
    if (previousReinit === undefined) delete process.env.DB_REINIT;
    else process.env.DB_REINIT = previousReinit;
  }
  await seedDemoData(database);
  await seedDemoData(database);
  await seedSettings(database);
  await seedFaq(database);
  await seedArticles(database);

  const legacyBrand = ['Tara', 'Wing'].join('');
  await database.run(
    `INSERT INTO faq (id,question,answer,category,sort_order,published,created_at)
     VALUES ('legacy_brand_faq',$1,'Legacy row','general',999,true,$2)`,
    [`${legacyBrand} legacy question`, '2026-10-29T00:00:00.000Z'],
  );
  await normalizeBrandText(database);

  const settings = await database.one(`SELECT value FROM settings WHERE key='site'`);
  assert.equal(settings.value.siteName, 'Tarawing');
  assert.deepEqual(settings.value.aiMechanism.endpoints, []);
  assert.deepEqual(settings.value.paymentMethods, []);
  assert.equal(settings.value.requireEmailVerification, false);
  assert.equal(settings.value.smtp.enabled, false);
  const normalizedFaq = await database.one('SELECT question FROM faq WHERE id=$1', ['legacy_brand_faq']);
  assert.equal(normalizedFaq.question, 'Tarawing legacy question');

  const user = await database.one('SELECT * FROM users WHERE email=$1', ['demo@tarawing.app']);
  assert.ok(user);
  assert.ok(user.email_verified_at);
  const migration = await database.one(
    'SELECT key FROM schema_migrations WHERE key=$1',
    ['users.email_verified_at_backfill_v1'],
  );
  assert.ok(migration);

  const reset = await createAuthToken(database, user.id, 'password_reset');
  const storedReset = await database.one(
    'SELECT token_hash FROM auth_tokens WHERE user_id=$1 AND purpose=$2',
    [user.id, 'password_reset'],
  );
  assert.equal(storedReset.token_hash, hashAuthToken(reset.token));
  assert.notEqual(storedReset.token_hash, reset.token);
  const consumedUser = await consumeAuthToken(database, reset.token, 'password_reset');
  assert.equal(consumedUser.id, user.id);
  assert.equal(await consumeAuthToken(database, reset.token, 'password_reset'), null);

  for (const table of ['readings', 'orders', 'notifications', 'consultations']) {
    const count = await database.one(`SELECT COUNT(*)::int AS count FROM ${table} WHERE user_id=$1`, [user.id]);
    assert.ok(count.count >= 1, `${table} should contain demo data`);
  }

  const stableReading = await database.one('SELECT * FROM readings WHERE id=$1', ['demo_rd_holy_triangle']);
  assert.equal(stableReading.status, 'detail_paid');
  assert.ok(stableReading.detailed_report);
  assert.ok(stableReading.deep_insights_report);
  assert.equal(stableReading.ai_prompt, null);

  await database.run(
    `UPDATE readings SET status='detail_unlocked' WHERE id=$1`,
    ['demo_rd_holy_triangle'],
  );
  await initSchema(database);
  const migratedReading = await database.one(
    'SELECT status FROM readings WHERE id=$1',
    ['demo_rd_holy_triangle'],
  );
  assert.equal(migratedReading.status, 'detail_paid');

  const lenormandPair = await database.one('SELECT * FROM readings WHERE id=$1', ['demo_rd_lenormand_pair']);
  assert.equal(lenormandPair.type, 'lenormand_pair');
  assert.equal(lenormandPair.result_basic.cards.length, 2);
  assert.deepEqual(
    lenormandPair.result_basic.cards.map((entry) => entry.position),
    ['Subject', 'Modifier'],
  );

  const firstPage = await listUserReadings(database, user.id, 2, null);
  assert.equal(firstPage.items.length, 2);
  assert.ok(firstPage.nextCursor);

  const secondPage = await listUserReadings(
    database,
    user.id,
    2,
    decodeCursor(firstPage.nextCursor),
  );
  const firstIds = new Set(firstPage.items.map((row) => row.id));
  assert.ok(secondPage.items.every((row) => !firstIds.has(row.id)));

  const users = await listAdminUsers(database, { q: 'Demo', limit: 25 });
  assert.ok(users.items.some((row) => row.id === user.id));

  const paidOrderPage = await listAdminOrders(database, { status: 'paid', limit: 1 });
  assert.equal(paidOrderPage.items.length, 1);
  assert.equal(paidOrderPage.items[0].status, 'paid');
  assert.equal(paidOrderPage.items[0].user_email, 'demo@tarawing.app');

  const tarotPage = await listAdminReadings(database, { type: 'tarot', limit: 25 });
  assert.ok(tarotPage.items.some((row) => row.id === 'demo_rd_tarot_fool'));
  assert.ok(tarotPage.items.every((row) => row.user_email === 'demo@tarawing.app'));

  const dto = toApiDto(stableReading);
  assert.equal(dto.deepInsightsReport, stableReading.deep_insights_report);
  assert.equal(dto.createdAt, stableReading.created_at);
  assert.equal(dto.created_at, undefined);
});
