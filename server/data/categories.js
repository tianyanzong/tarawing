'use strict';
// Pricing and admin-reporting category for each reading type. Three
// categories, matching the site's three "engines": tarot (single-card
// draws, the Oracle Engine), astrology (natal chart + the Seven Planets
// bridge spread), and spreads (the Sacred Layout Engine on /spreads).
const CATEGORY_OF_TYPE = {
  tarot: 'tarot',
  lenormand: 'tarot',
  playing_cards: 'tarot',
  astrology_natal: 'astrology',
  seven_planets: 'astrology',
  lenormand_pair: 'spreads',
  holy_triangle: 'spreads',
  gypsy_cross: 'spreads',
  hexagram: 'spreads',
  solomon_star: 'spreads',
};

const CATEGORIES = ['tarot', 'astrology', 'spreads'];

function categoryOf(readingType) {
  return CATEGORY_OF_TYPE[readingType] || null;
}

module.exports = { CATEGORY_OF_TYPE, CATEGORIES, categoryOf };
