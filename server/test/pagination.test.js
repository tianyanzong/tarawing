'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildPage,
  decodeCursor,
  encodeCursor,
  parsePagination,
} = require('../utils/pagination');

test('round-trips a compound created_at/id cursor', () => {
  const row = { id: 'rd_123', created_at: '2026-10-26T11:00:00.000Z' };
  const cursor = encodeCursor(row);

  assert.deepEqual(decodeCursor(cursor), {
    createdAt: row.created_at,
    id: row.id,
  });
});

test('rejects malformed cursors instead of silently restarting pagination', () => {
  assert.equal(decodeCursor('not-a-valid-cursor'), null);
});

test('clamps page size and returns the cursor for the last visible row', () => {
  const rows = Array.from({ length: 4 }, (_, index) => ({
    id: `rd_${index}`,
    created_at: `2026-10-26T11:0${index}:00.000Z`,
  }));

  const page = buildPage(rows, 3);

  assert.equal(page.items.length, 3);
  assert.equal(page.nextCursor, encodeCursor(rows[2]));
  assert.deepEqual(page.items, rows.slice(0, 3));
});

test('omits nextCursor when no additional row is available', () => {
  const rows = [{ id: 'rd_1', created_at: '2026-10-26T11:00:00.000Z' }];

  assert.deepEqual(buildPage(rows, 25), { items: rows, nextCursor: null });
});

test('defaults the limit and rejects bad pagination query values', () => {
  assert.deepEqual(parsePagination({}), { limit: 25, cursor: null });
  assert.equal(parsePagination({ limit: '500' }).limit, 100);
  assert.match(parsePagination({ cursor: 'bad' }).error, /cursor/i);
});
