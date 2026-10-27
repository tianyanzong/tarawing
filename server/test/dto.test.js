'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { toApiDto } = require('../utils/dto');

test('converts nested database keys to camelCase without changing values', () => {
  const input = {
    result_basic: {
      cards: [{ card_name: 'The Fool', created_at: '2026-10-27T10:00:00.000Z' }],
    },
    deep_insights_report: null,
    role: 'banned_temp',
    reading_created_at: '2026-10-27T10:00:00.000Z',
  };

  assert.deepEqual(toApiDto(input), {
    resultBasic: {
      cards: [{ cardName: 'The Fool', createdAt: '2026-10-27T10:00:00.000Z' }],
    },
    deepInsightsReport: null,
    role: 'banned_temp',
    readingCreatedAt: '2026-10-27T10:00:00.000Z',
  });
});

test('preserves camelCase keys and maps paginated arrays', () => {
  assert.deepEqual(
    toApiDto({
      items: [{ user_id: 'usr_1', amount_cents: 299 }],
      nextCursor: null,
    }),
    {
      items: [{ userId: 'usr_1', amountCents: 299 }],
      nextCursor: null,
    },
  );
});
