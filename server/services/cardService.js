/**
 * server/services/cardService.js
 * Shuffling and drawing for Tarot / Lenormand / Playing Cards, and mapping
 * draws onto named spread positions. Never uses Math.random() for the
 * shuffle — Node's crypto module gives an unpredictable, non-reproducible
 * draw, which matters for a divination product's credibility.
 */
'use strict';
const crypto = require('crypto');
const { FULL_DECK } = require('../data/tarotDeck');
const { LENORMAND_DECK } = require('../data/lenormandDeck');
const { PLAYING_CARDS_DECK, PLAYING_CARDS_36_DECK } = require('../data/playingCardsDeck');
const { SPREADS } = require('../data/spreads');

// Each Sacred Layout spread (plus the Seven Planets bridge spread) uses a
// fixed deck — this isn't a UI default, it's enforced here server-side so
// a crafted request can't override it. Gypsy Cross traditionally draws
// from a 36-card shortened pack, not the full 52; the others are Tarot-only.
const SPREAD_DECK = {
  lenormand_pair: 'lenormand',
  holy_triangle: 'tarot',
  gypsy_cross: 'playing_cards_36',
  hexagram: 'tarot',
  solomon_star: 'tarot',
  seven_planets: 'tarot',
};

function deckFor(name) {
  if (name === 'tarot') return FULL_DECK;
  if (name === 'lenormand') return LENORMAND_DECK;
  if (name === 'playing_cards') return PLAYING_CARDS_DECK;
  if (name === 'playing_cards_36') return PLAYING_CARDS_36_DECK;
  throw new Error(`Unknown deck: ${name}`);
}

// Cryptographically secure Fisher-Yates shuffle.
function secureShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1); // crypto.randomInt is CSPRNG-backed
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function secureCoinFlip() {
  return crypto.randomInt(0, 2) === 0;
}

/**
 * Draw `count` unique cards from the named deck. Tarot cards additionally
 * get an upright/reversed orientation via a secure coin flip.
 */
function drawCards(deckName, count) {
  const deck = deckFor(deckName);
  if (count > deck.length) throw new Error('Cannot draw more cards than the deck contains.');
  const shuffled = secureShuffle(deck);
  const drawn = shuffled.slice(0, count);
  if (deckName === 'tarot') {
    return drawn.map((card) => {
      const reversed = secureCoinFlip();
      return { ...card, reversed, meaning: reversed ? card.reversed : card.upright };
    });
  }
  return drawn.map((card) => ({ ...card, meaning: card.meaning }));
}

/**
 * Draw a full named spread. The deck is NOT a caller-supplied option; each
 * spread has exactly one correct deck (see SPREAD_DECK above), applied here
 * regardless of anything a client might send.
 */
function drawSpread(spreadKey) {
  const spread = SPREADS[spreadKey];
  if (!spread) throw new Error(`Unknown spread: ${spreadKey}`);
  const deckName = SPREAD_DECK[spreadKey];
  const cards = drawCards(deckName, spread.cardCount);
  return {
    spread: spreadKey,
    label: spread.label,
    deck: deckName,
    cards: cards.map((card, i) => ({ position: spread.positions[i], card })),
  };
}

module.exports = { drawCards, drawSpread, secureShuffle, secureCoinFlip, SPREAD_DECK };
