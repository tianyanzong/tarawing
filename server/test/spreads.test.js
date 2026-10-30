'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { SPREADS } = require('../data/spreads');
const { drawSpread, SPREAD_DECK } = require('../services/cardService');

test('Lenormand Pair is the first Sacred Layout option', () => {
  assert.equal(Object.keys(SPREADS)[0], 'lenormand_pair');
  assert.deepEqual(SPREADS.lenormand_pair, {
    label: 'Lenormand Pair',
    cardCount: 2,
    positions: ['Subject', 'Modifier'],
  });
});

test('Lenormand Pair always draws two Lenormand cards in order', () => {
  assert.equal(SPREAD_DECK.lenormand_pair, 'lenormand');
  const result = drawSpread('lenormand_pair');

  assert.equal(result.spread, 'lenormand_pair');
  assert.equal(result.deck, 'lenormand');
  assert.deepEqual(result.cards.map((entry) => entry.position), ['Subject', 'Modifier']);
  assert.equal(result.cards.length, 2);
  assert.ok(result.cards.every((entry) => entry.card.n >= 1 && entry.card.n <= 36));
});
