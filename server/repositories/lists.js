'use strict';

const { buildPage } = require('../utils/pagination');

async function queryPage(database, { select, from, where = [], params = [], limit, cursor }) {
  const queryParams = [...params];
  const clauses = [...where];

  if (cursor) {
    queryParams.push(cursor.createdAt, cursor.id);
    clauses.push(`(created_at,id) < ($${queryParams.length - 1},$${queryParams.length})`);
  }

  queryParams.push(limit + 1);
  const rows = await database.all(
    `SELECT ${select}
     FROM ${from}
     ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
     ORDER BY created_at DESC,id DESC
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
  const where = ['deleted=false'];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`status=$${params.length}`);
  }

  return queryPage(database, {
    select: '*',
    from: 'orders',
    where,
    params,
    limit,
    cursor,
  });
}

function listAdminReadings(database, { type = '', limit, cursor = null }) {
  const where = [];
  const params = [];
  if (type) {
    params.push(type);
    where.push(`type=$${params.length}`);
  }

  return queryPage(database, {
    select: 'id,user_id,type,question,status,created_at',
    from: 'readings',
    where,
    params,
    limit,
    cursor,
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
