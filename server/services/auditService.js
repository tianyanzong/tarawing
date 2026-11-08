'use strict';

const { id, now } = require('../db');

async function recordAuditEvent(database, {
  eventType,
  message,
  level = 'info',
  admin = null,
  target = null,
  metadata = {},
}) {
  await database.run(
    `INSERT INTO audit_logs (id,admin_id,admin_name,action,target,meta,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id('log'),
      admin?.id || null,
      admin?.username || null,
      eventType,
      target,
      JSON.stringify({ ...metadata, level, message }),
      now(),
    ],
  );
}

module.exports = { recordAuditEvent };
