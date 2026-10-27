import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCardArtDescriptor } from './cardArt';

test('maps a Major Arcana card to its numbered tarot artwork', () => {
  assert.deepEqual(
    resolveCardArtDescriptor({
      name: 'The Fool',
      meaning: 'New beginnings.',
      arcana: 'major',
      num: 0,
    }),
    { deck: 'tarot', key: '00-TheFool' },
  );
});

test('maps a tarot court card to its numbered minor artwork', () => {
  assert.deepEqual(
    resolveCardArtDescriptor({
      name: 'Queen of Cups',
      meaning: 'Intuition.',
      arcana: 'minor',
      suit: 'cups',
      rank: 'Queen',
    }),
    { deck: 'tarot', key: 'Cups13' },
  );
});

test('maps a playing card to its named artwork', () => {
  assert.deepEqual(
    resolveCardArtDescriptor({
      name: 'Ace of Spades',
      meaning: 'A turning point.',
      suit: 'Spades',
      rank: 'A',
    }),
    { deck: 'playing', key: 'ace_of_spades' },
  );
});

test('maps red and black Jokers to their renamed artwork files', () => {
  assert.deepEqual(
    resolveCardArtDescriptor({ name: 'Black Joker', meaning: 'A wild card.' }),
    { deck: 'playing', key: 'joker_black' },
  );
  assert.deepEqual(
    resolveCardArtDescriptor({ name: 'Red Joker', meaning: 'A wild card.' }),
    { deck: 'playing', key: 'joker_red' },
  );
});

test('maps Lenormand cards by their canonical deck number', () => {
  const cards = [
    { name: 'Rider', meaning: 'News.', n: 1, key: '01_rider' },
    { name: 'Coffin', meaning: 'An ending.', n: 8, key: '08_coffin' },
    { name: 'Crossroad', meaning: 'A choice.', n: 22, key: '22_path' },
    { name: 'Lily', meaning: 'Maturity.', n: 30, key: '30_lilies' },
  ];

  for (const { key, ...card } of cards) {
    assert.deepEqual(resolveCardArtDescriptor(card), { deck: 'lenormand', key });
  }
});
