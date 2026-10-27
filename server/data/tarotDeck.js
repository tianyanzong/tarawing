/**
 * server/data/tarotDeck.js
 * 78-card Rider-Waite-Smith-tradition deck. Major Arcana are hand-written,
 * one entry each. Minor Arcana (56 cards) are assembled from a suit-theme x
 * rank-theme table below — this keeps every card individually addressable
 * and avoids reproducing any single author's copyrighted interpretation
 * text, while still giving each of the 56 cards its own distinct meaning.
 */
'use strict';

const MAJOR_ARCANA = [
  { name: 'The Fool', num: 0, upright: 'New beginnings, innocence, a leap of faith into the unknown.', reversed: 'Recklessness, hesitation, fear of the unknown holding you back.' },
  { name: 'The Magician', num: 1, upright: 'Willpower, resourcefulness, turning ideas into action.', reversed: 'Manipulation, untapped potential, scattered focus.' },
  { name: 'The High Priestess', num: 2, upright: 'Intuition, hidden knowledge, stillness before revelation.', reversed: 'Disconnection from instinct, secrets, information withheld.' },
  { name: 'The Empress', num: 3, upright: 'Abundance, nurturing, creativity coming to fruition.', reversed: 'Creative block, neglect, dependence.' },
  { name: 'The Emperor', num: 4, upright: 'Structure, authority, discipline that builds something lasting.', reversed: 'Rigidity, domination, loss of control.' },
  { name: 'The Hierophant', num: 5, upright: 'Tradition, shared belief, learning within established structure.', reversed: 'Breaking convention, questioning doctrine, restriction.' },
  { name: 'The Lovers', num: 6, upright: 'Union, alignment of values, a meaningful choice.', reversed: 'Imbalance, misalignment, a relationship at a crossroads.' },
  { name: 'The Chariot', num: 7, upright: 'Willpower, determination, victory through focused control.', reversed: 'Lack of direction, aggression, loss of control.' },
  { name: 'Strength', num: 8, upright: 'Quiet courage, patience, mastering instinct with compassion.', reversed: 'Self-doubt, insecurity, forcing an outcome.' },
  { name: 'The Hermit', num: 9, upright: 'Introspection, solitude, seeking inner guidance.', reversed: 'Isolation, withdrawal, avoiding the questions that matter.' },
  { name: 'Wheel of Fortune', num: 10, upright: 'Cycles, fate, a turning point arriving on its own schedule.', reversed: 'Resistance to change, bad luck, a cycle repeating.' },
  { name: 'Justice', num: 11, upright: 'Fairness, cause and effect, a decision weighed clearly.', reversed: 'Unfairness, avoidance of accountability, imbalance.' },
  { name: 'The Hanged Man', num: 12, upright: 'Surrender, a new perspective gained by pausing.', reversed: 'Stalling, resistance to letting go, a wasted pause.' },
  { name: 'Death', num: 13, upright: 'Endings that clear space for transformation.', reversed: 'Resistance to necessary change, stagnation.' },
  { name: 'Temperance', num: 14, upright: 'Balance, moderation, patient blending of opposites.', reversed: 'Excess, imbalance, impatience.' },
  { name: 'The Devil', num: 15, upright: 'Attachment, temptation, a pattern that has become a trap.', reversed: 'Breaking free, releasing a limiting pattern.' },
  { name: 'The Tower', num: 16, upright: 'Sudden upheaval, a foundation giving way to truth.', reversed: 'Delayed collapse, fear of change, disaster narrowly avoided.' },
  { name: 'The Star', num: 17, upright: 'Hope, renewal, quiet faith after difficulty.', reversed: 'Discouragement, lost hope, disconnection from purpose.' },
  { name: 'The Moon', num: 18, upright: 'Uncertainty, intuition, what lies beneath the surface.', reversed: 'Confusion clearing, repressed fear surfacing.' },
  { name: 'The Sun', num: 19, upright: 'Clarity, vitality, success plainly visible.', reversed: 'Temporary clouding of joy, delayed success.' },
  { name: 'Judgement', num: 20, upright: 'Reckoning, awakening, a call to a higher purpose.', reversed: 'Self-doubt, avoiding a necessary reckoning.' },
  { name: 'The World', num: 21, upright: 'Completion, wholeness, a cycle successfully closed.', reversed: 'Unfinished business, a cycle short of closure.' },
];

const SUITS = [
  { key: 'wands', name: 'Wands', element: 'Fire', domain: 'passion, ambition, and creative drive' },
  { key: 'cups', name: 'Cups', element: 'Water', domain: 'emotion, relationship, and intuition' },
  { key: 'swords', name: 'Swords', element: 'Air', domain: 'thought, conflict, and truth-telling' },
  { key: 'pentacles', name: 'Pentacles', element: 'Earth', domain: 'work, resources, and material security' },
];

// Rank themes are suit-agnostic; combined with each suit's domain below.
const NUMBER_RANKS = [
  { n: 1, label: 'Ace', upright: 'a fresh spark of', reversed: 'a missed or delayed spark of' },
  { n: 2, label: 'Two', upright: 'a choice or partnership forming around', reversed: 'imbalance or indecision around' },
  { n: 3, label: 'Three', upright: 'early growth and collaboration in', reversed: 'friction or delay in early growth around' },
  { n: 4, label: 'Four', upright: 'stability and a pause to consolidate', reversed: 'stagnation or over-caution around' },
  { n: 5, label: 'Five', upright: 'conflict or a test that demands adjusting', reversed: 'lingering conflict avoided instead of resolved in' },
  { n: 6, label: 'Six', upright: 'a return to harmony and forward motion in', reversed: 'a one-sided or delayed harmony around' },
  { n: 7, label: 'Seven', upright: 'patience, strategy, and quiet reassessment of', reversed: 'doubt or scattered effort undermining' },
  { n: 8, label: 'Eight', upright: 'swift momentum and mastery building in', reversed: 'frustration or misdirected effort in' },
  { n: 9, label: 'Nine', upright: 'near-completion and resilience within', reversed: 'anxiety or exhaustion nearing the end of' },
  { n: 10, label: 'Ten', upright: 'culmination — a full cycle completed in', reversed: 'a burden or ending overdue in' },
];
const COURT_RANKS = [
  { label: 'Page', upright: 'curiosity, a message, or a student\u2019s enthusiasm for', reversed: 'immaturity or a missed message about' },
  { label: 'Knight', upright: 'bold, fast-moving pursuit of', reversed: 'recklessness or stalled momentum in pursuing' },
  { label: 'Queen', upright: 'intuitive, nurturing mastery of', reversed: 'insecurity or withheld nurturing around' },
  { label: 'King', upright: 'confident, disciplined command of', reversed: 'controlling or rigid authority over' },
];

function buildMinorArcana() {
  const cards = [];
  for (const suit of SUITS) {
    for (const r of NUMBER_RANKS) {
      cards.push({
        name: `${r.label} of ${suit.name}`,
        suit: suit.key,
        rank: r.label,
        upright: `${r.upright[0].toUpperCase()}${r.upright.slice(1)} ${suit.domain}.`,
        reversed: `${r.reversed[0].toUpperCase()}${r.reversed.slice(1)} ${suit.domain}.`,
      });
    }
    for (const c of COURT_RANKS) {
      cards.push({
        name: `${c.label} of ${suit.name}`,
        suit: suit.key,
        rank: c.label,
        upright: `${c.upright[0].toUpperCase()}${c.upright.slice(1)} ${suit.domain}.`,
        reversed: `${c.reversed[0].toUpperCase()}${c.reversed.slice(1)} ${suit.domain}.`,
      });
    }
  }
  return cards;
}

const FULL_DECK = [
  ...MAJOR_ARCANA.map((c) => ({ ...c, arcana: 'major', id: `major_${c.num}` })),
  ...buildMinorArcana().map((c, i) => ({ ...c, arcana: 'minor', id: `minor_${c.suit}_${i}` })),
];

module.exports = { MAJOR_ARCANA, SUITS, FULL_DECK };
