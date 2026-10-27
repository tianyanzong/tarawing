'use strict';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseLimit(raw) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function encodeCursor(row) {
  if (!row || typeof row.created_at !== 'string' || typeof row.id !== 'string') {
    return null;
  }

  return Buffer.from(JSON.stringify({
    createdAt: row.created_at,
    id: row.id,
  })).toString('base64url');
}

function decodeCursor(value) {
  if (typeof value !== 'string' || !value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      typeof parsed?.createdAt !== 'string'
      || !parsed.createdAt
      || Number.isNaN(Date.parse(parsed.createdAt))
      || typeof parsed?.id !== 'string'
      || !parsed.id
    ) {
      return null;
    }
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function buildPage(rows, limit) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null,
  };
}

function parsePagination(query = {}) {
  const limit = parseLimit(query.limit);
  if (!query.cursor) return { limit, cursor: null };

  const cursor = decodeCursor(query.cursor);
  if (!cursor) {
    return { limit, cursor: null, error: 'Invalid pagination cursor.' };
  }

  return { limit, cursor };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  buildPage,
  decodeCursor,
  encodeCursor,
  parsePagination,
};
