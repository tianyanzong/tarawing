'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { recordAuditEvent } = require('../services/auditService');

test('records a structured event in the shared audit log stream', async () => {
  let inserted;
  const database = {
    run: async (sql, params) => { inserted = { sql, params }; },
  };

  await recordAuditEvent(database, {
    eventType: 'email.password_reset.error',
    message: 'Password-reset email failed',
    level: 'error',
    target: 'usr_1',
    metadata: { errorMessage: 'SMTP unavailable' },
  });

  assert.match(inserted.sql, /INSERT INTO audit_logs/);
  assert.equal(inserted.params[3], 'email.password_reset.error');
  assert.equal(inserted.params[4], 'usr_1');
  assert.deepEqual(JSON.parse(inserted.params[5]), {
    errorMessage: 'SMTP unavailable',
    level: 'error',
    message: 'Password-reset email failed',
  });
});
