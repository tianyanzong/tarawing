'use strict';

const { buildPage } = require('../utils/pagination');

async function queryPage(database, {
  select,
  from,
  where = [],
  params = [],
  limit,
  cursor,
  cursorPrefix = '',
}) {
  const queryParams = [...params];
  const clauses = [...where];
  const createdAt = `${cursorPrefix}created_at`;
  const id = `${cursorPrefix}id`;

  if (cursor) {
    queryParams.push(cursor.createdAt, cursor.id);
    clauses.push(`(${createdAt},${id}) < ($${queryParams.length - 1},$${queryParams.length})`);
  }

  queryParams.push(limit + 1);
  const rows = await database.all(
    `SELECT ${select}
     FROM ${from}
     ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
     ORDER BY ${createdAt} DESC,${id} DESC
     LIMIT $${queryParams.length}`,
    queryParams,
  );

  return buildPage(rows, limit);
}

function listUserReadings(database, userId, limit, cursor = null) {
  return queryPage(database, {
    select: 'id,type,question,status,result_basic,deep_insights_report,created_at',
    from: 'readings',
    where: ['user_id=$1'],
    params: [userId],
    limit,
    cursor,
  });
}

function listUserOrders(database, userId, limit, cursor = null) {
  return queryPage(database, {
    select: '*',
    from: 'orders',
    where: ['user_id=$1', 'deleted=false'],
    params: [userId],
    limit,
    cursor,
  });
}

function listAdminUsers(database, { q = '', limit, cursor = null }) {
  return queryPage(database, {
    select: 'id,name,email,role,last_active,created_at',
    from: 'users',
    where: ['(name ILIKE $1 OR email ILIKE $1)'],
    params: [`%${q}%`],
    limit,
    cursor,
  });
}

function listAdminOrders(database, { status = '', limit, cursor = null }) {
  const where = ['o.deleted=false'];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`o.status=$${params.length}`);
  }

  return queryPage(database, {
    select: 'o.*,u.email AS user_email',
    from: 'orders o LEFT JOIN users u ON u.id=o.user_id',
    where,
    params,
    limit,
    cursor,
    cursorPrefix: 'o.',
  });
}

function listAdminReadings(database, { type = '', limit, cursor = null }) {
  const where = [];
  const params = [];
  if (type) {
    params.push(type);
    where.push(`r.type=$${params.length}`);
  }

  return queryPage(database, {
    select: 'r.id,r.user_id,r.type,r.question,r.status,r.created_at,u.email AS user_email',
    from: 'readings r LEFT JOIN users u ON u.id=r.user_id',
    where,
    params,
    limit,
    cursor,
    cursorPrefix: 'r.',
  });
}

module.exports = {
  listAdminOrders,
  listAdminReadings,
  listAdminUsers,
  listUserOrders,
  listUserReadings,
  queryPage,
};
