'use strict';
// Position definitions for the Sacred Layout Engine (holy_triangle,
// gypsy_cross, hexagram, solomon_star — exposed via the consolidated
// /spreads page) plus the Seven Planets bridge spread (exposed as a mode
// on the /astrology page, not under /spreads). Each spread lists its card
// count, its positions, and — in cardService.SPREAD_DECK — exactly one
// fixed deck; there is no client-selectable deck for any of these.
const SPREADS = {
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
