/**
 * server/services/reportService.js
 *
 * Built-in server-side algorithm (deliberately NOT an AI call) that turns
 * a reading's raw draw/chart data into two tiers of write-up:
 *   - generateSimpleReport()   — free, short, mostly restates what was drawn
 *   - generateDetailedReport() — paid (tier 'detail'), longer, adds
 *     position-aware framing and a first/last-card synthesis for spreads,
 *     or a Sun/Moon element-combination note for astrology.
 *
 * This is intentionally template-based and deterministic — the "Deep
 * Insights" tier (server/services/aiReading.js) is where bespoke AI prose
 * lives. Keeping these separate is the whole point of the two-tier design.
 */
'use strict';
const { ZODIAC_TRAITS, elementPairNote } = require('../data/zodiacTraits');

const CARD_TYPES = new Set([
  'tarot', 'lenormand', 'playing_cards',
  'holy_triangle', 'gypsy_cross', 'hexagram', 'solomon_star', 'seven_planets',
]);

function cardLine(dc) {
  const orientation = dc.card.reversed != null ? (dc.card.reversed ? ' (reversed)' : '') : '';
  return `${dc.position}: ${dc.card.name}${orientation} — ${dc.card.meaning}`;
}

function simpleCardReport(reading) {
  const cards = reading.result_basic?.cards || [];
  const lead = reading.question
    ? `Here's a quick read on "${reading.question}":`
    : "Here's a quick read on your draw:";
  const lines = cards.map(cardLine);
  const closing = cards.length > 1
    ? `Together, these cards move from ${cards[0].card.name} toward ${cards[cards.length - 1].card.name} — that arc is worth sitting with before you act on any single card alone.`
    : 'Sit with this one a moment before you act on it — a single card is a prompt, not a verdict.';
  return [lead, '', ...lines, '', closing].join('\n');
}

const DEPTH_PHRASE_FIRST = 'sets the stage for everything else in this draw';
const DEPTH_PHRASE_LAST = 'points toward where this situation is headed if nothing changes';
const DEPTH_PHRASE_MID = 'adds its own pressure to the mix, for better or worse';

function detailedCardReport(reading) {
  const cards = reading.result_basic?.cards || [];
  const lead = reading.question
    ? `You asked: "${reading.question}". Here's a deeper look at what came up.`
    : "Here's a deeper look at what came up in this draw.";

  const body = cards.map((dc, i) => {
    const depth = cards.length === 1 ? '' : i === 0 ? ` This card ${DEPTH_PHRASE_FIRST}.`
      : i === cards.length - 1 ? ` This card ${DEPTH_PHRASE_LAST}.`
      : ` This card ${DEPTH_PHRASE_MID}.`;
    return `${cardLine(dc)}${depth}`;
  });

  const reversedCount = cards.filter((dc) => dc.card.reversed).length;
  const reversedNote = reversedCount > 0
    ? `${reversedCount} card${reversedCount > 1 ? 's' : ''} came up reversed — treat ${reversedCount > 1 ? 'those' : 'that'} as friction, delay, or an inward version of the usual meaning rather than its opposite.`
    : 'Every card came up upright — nothing here is fighting itself; the main tension, if any, is between the positions rather than within a single card.';

  const synthesis = cards.length > 1
    ? `Reading ${cards[0].card.name} into ${cards[cards.length - 1].card.name}: this spread's arc runs from "${cards[0].card.meaning}" toward "${cards[cards.length - 1].card.meaning}". ${reversedNote}`
    : reversedNote;

  return [lead, '', ...body, '', synthesis].join('\n');
}

function simpleAstrologyReport(reading) {
  const chart = reading.result_basic || {};
  const parts = [];
  if (chart.sun) parts.push(`Sun in ${chart.sun.sign} — ${ZODIAC_TRAITS[chart.sun.sign]?.trait || 'a sign in its own right'}.`);
  if (chart.moon) parts.push(`Moon in ${chart.moon.sign} — ${ZODIAC_TRAITS[chart.moon.sign]?.trait || 'a sign in its own right'}.`);
  if (chart.ascendant) parts.push(`Ascendant in ${chart.ascendant.sign} — this is the first impression you tend to give.`);
  const lead = reading.question
    ? `On "${reading.question}", here's what your chart offers at a glance:`
    : "Here's what your chart offers at a glance:";
  return [lead, '', ...parts].join('\n');
}

function detailedAstrologyReport(reading) {
  const chart = reading.result_basic || {};
  const lead = reading.question
    ? `You asked: "${reading.question}". Here's a fuller look at your chart.`
    : "Here's a fuller look at your chart.";

  const sections = [];
  if (chart.sun) {
    const t = ZODIAC_TRAITS[chart.sun.sign];
    sections.push(`Sun in ${chart.sun.sign} (${chart.sun.degreeInSign}° in): your core identity tends to be ${t?.trait || 'distinctly itself'}, a ${t?.modality || ''} ${t?.element || ''} sign at its root.`);
  }
  if (chart.moon) {
    const t = ZODIAC_TRAITS[chart.moon.sign];
    sections.push(`Moon in ${chart.moon.sign} (${chart.moon.degreeInSign}° in): underneath, your emotional instincts run ${t?.trait || 'their own course'}.`);
  }
  if (chart.sun && chart.moon) {
    const note = elementPairNote(ZODIAC_TRAITS[chart.sun.sign]?.element, ZODIAC_TRAITS[chart.moon.sign]?.element);
    sections.push(`Sun and Moon together suggest ${note}.`);
  }
  if (chart.ascendant) {
    const t = ZODIAC_TRAITS[chart.ascendant.sign];
    sections.push(`Ascendant in ${chart.ascendant.sign} (${chart.ascendant.degreeInSign}° in): people tend to meet a ${t?.trait || 'particular'} version of you before they get to know the Sun or Moon underneath.`);
  }
  if (Array.isArray(chart.caveats) && chart.caveats.length) {
    sections.push(`Worth noting: ${chart.caveats.join(' ')}`);
  }
  if (chart.planetsNote) sections.push(chart.planetsNote);

  return [lead, ...sections].join('\n\n');
}

function generateSimpleReport(reading) {
  if (CARD_TYPES.has(reading.type)) return simpleCardReport(reading);
  if (reading.type === 'astrology_natal') return simpleAstrologyReport(reading);
  throw new Error(`No simple-report generator for reading type: ${reading.type}`);
}

function generateDetailedReport(reading) {
  if (CARD_TYPES.has(reading.type)) return detailedCardReport(reading);
  if (reading.type === 'astrology_natal') return detailedAstrologyReport(reading);
  throw new Error(`No detailed-report generator for reading type: ${reading.type}`);
}

module.exports = { generateSimpleReport, generateDetailedReport };
