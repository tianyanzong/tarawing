'use strict';
// General, traditional Western-astrology sign associations (element,
// modality, a short trait phrase) — public-domain astrological convention,
// not quoted from any single source. Used by reportService.js to assemble
// deterministic (non-AI) report text.
const ZODIAC_TRAITS = {
  Aries: { element: 'Fire', modality: 'Cardinal', trait: 'direct, driven, and quick to act' },
  Taurus: { element: 'Earth', modality: 'Fixed', trait: 'steady, grounded, and slow to change course' },
  Gemini: { element: 'Air', modality: 'Mutable', trait: 'curious, quick-witted, and adaptable' },
  Cancer: { element: 'Water', modality: 'Cardinal', trait: 'protective, intuitive, and emotionally attuned' },
  Leo: { element: 'Fire', modality: 'Fixed', trait: 'warm, expressive, and drawn to being seen' },
  Virgo: { element: 'Earth', modality: 'Mutable', trait: 'precise, practical, and quietly perfectionist' },
  Libra: { element: 'Air', modality: 'Cardinal', trait: 'diplomatic, relational, and balance-seeking' },
  Scorpio: { element: 'Water', modality: 'Fixed', trait: 'intense, perceptive, and all-or-nothing' },
  Sagittarius: { element: 'Fire', modality: 'Mutable', trait: 'restless, optimistic, and drawn to the horizon' },
  Capricorn: { element: 'Earth', modality: 'Cardinal', trait: 'disciplined, ambitious, and patient with the long game' },
  Aquarius: { element: 'Air', modality: 'Fixed', trait: 'independent, idea-driven, and a little detached' },
  Pisces: { element: 'Water', modality: 'Mutable', trait: 'absorbent, imaginative, and easily moved' },
};

const ELEMENT_PAIR_NOTE = {
  // keyed as "ElementA-ElementB" (order-independent, see reportService)
  'Fire-Fire': 'a lot of momentum in the same direction — energizing, but with little built-in brake',
  'Fire-Earth': 'a push-and-pull between wanting to move fast and needing things to be solid first',
  'Fire-Air': 'an easy, self-feeding spark — ideas and action keep lighting each other up',
  'Fire-Water': 'real tension between heat and feeling — passion that can either fuel or extinguish itself',
  'Earth-Earth': 'a strong, stable base, though it can be slow to budge once settled',
  'Earth-Air': 'a practical mind paired with a need for ideas to actually go somewhere',
  'Earth-Water': 'a quietly nurturing combination — patient, loyal, slow to reveal itself',
  'Air-Air': 'a lot of mental motion — fast, curious, occasionally scattered',
  'Air-Water': 'thought and feeling often talking past each other before they sync up',
  'Water-Water': 'deep emotional undertow — sensitive, perceptive, and easily overwhelmed if unchecked',
};

function elementPairNote(elA, elB) {
  return ELEMENT_PAIR_NOTE[`${elA}-${elB}`] || ELEMENT_PAIR_NOTE[`${elB}-${elA}`] || 'a combination worth sitting with rather than summarizing in one line';
}

module.exports = { ZODIAC_TRAITS, elementPairNote };
