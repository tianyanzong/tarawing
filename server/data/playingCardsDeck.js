'use strict';
// Standard 52-card deck with the traditional cartomancy (playing-card
// fortune-telling) meaning for each rank, adjusted by suit domain — a
// well-known folk system, assembled here rather than quoted from any one
// source.
const SUIT_DOMAIN = {
  Hearts: 'love and relationships',
  Diamonds: 'money and material matters',
  Clubs: 'work, ambition, and communication',
  Spades: 'challenge, effort, and hard truth',
};
const RANK_MEANING = {
  'A': 'a fresh start or turning point in',
  '2': 'a partnership or balance forming in',
  '3': 'small growth or a decision taking shape in',
  '4': 'stability, or a pause, settling into',
  '5': 'a change or minor setback shaking up',
  '6': 'harmony returning to',
  '7': 'a test of patience within',
  '8': 'momentum building around',
  '9': 'a wish nearing fulfillment in',
  '10': 'completion or a full cycle in',
  'J': 'a young, energetic influence entering',
  'Q': 'an intuitive, nurturing influence guiding',
  'K': 'an authoritative, mature influence steering',
};
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];

const PLAYING_CARDS_DECK = [];
for (const suit of SUITS) {
  for (const rank of RANKS) {
    PLAYING_CARDS_DECK.push({
      name: `${rank} of ${suit}`,
      suit, rank,
      meaning: `Points to ${RANK_MEANING[rank]} ${SUIT_DOMAIN[suit]}.`,
    });
  }
}
// Shortened 36-card deck (a standard 52-card deck with the 2, 3, 4, and 5
// ranks removed — the "Skat"/"Piquet" pack size used in several European
// cartomancy traditions, including the Gypsy Cross spread).
const SHORT_RANKS = RANKS.filter((r) => !['2', '3', '4', '5'].includes(r));
const PLAYING_CARDS_36_DECK = PLAYING_CARDS_DECK.filter((c) => SHORT_RANKS.includes(c.rank));

module.exports = { PLAYING_CARDS_DECK, PLAYING_CARDS_36_DECK };
