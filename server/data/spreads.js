'use strict';
// Position definitions for the Sacred Layout Engine, plus the Seven Planets
// bridge spread exposed under /astrology. Each spread lists its card count,
// positions, and exactly one fixed deck in cardService.SPREAD_DECK.
const SPREADS = {
  lenormand_pair: {
    label: 'Lenormand Pair', cardCount: 2,
    positions: ['Subject', 'Modifier'],
  },
  holy_triangle: {
    label: 'Holy Triangle', cardCount: 3,
    positions: ['Past', 'Present', 'Future'],
  },
  gypsy_cross: {
    label: 'Gypsy Cross', cardCount: 5,
    positions: ['The Querent', 'What Helps', 'What Hinders', 'The Foundation', 'The Outcome'],
  },
  hexagram: {
    label: 'Hexagram Spread', cardCount: 7,
    positions: ['Past', 'Present', 'Future', 'Internal Influence', 'External Influence', 'Advice', 'Likely Outcome'],
  },
  solomon_star: {
    label: "Star of Solomon", cardCount: 8,
    positions: ['Root Cause', 'Present State', 'Hidden Influence', 'What Blocks You', 'What Supports You', 'Near Future', 'Deeper Lesson', 'Ultimate Outcome'],
  },
  seven_planets: {
    label: 'Seven Planets Layout', cardCount: 7,
    positions: ['Sun \u2014 Core Self', 'Moon \u2014 Emotions', 'Mercury \u2014 Mind & Communication', 'Venus \u2014 Love & Values', 'Mars \u2014 Drive & Conflict', 'Jupiter \u2014 Growth & Luck', 'Saturn \u2014 Discipline & Limits'],
  },
};
module.exports = { SPREADS };
