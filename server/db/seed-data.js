'use strict';

const FAQ_SEED = [
  { q: 'Is my birth data private?', a: 'Yes. Birth details are stored only against your account and are never shared. You can delete any reading from your dashboard at any time.', category: 'privacy', order: 1 },
  { q: 'How accurate is the natal chart calculator?', a: 'Planetary positions are computed with the astronomy-engine library from your exact birth date, time, and location. Accuracy depends on how precise the birth time you enter is — even a few minutes can shift the Ascendant.', category: 'astrology', order: 2 },
  { q: 'What is the difference between Tarot, Lenormand, and Playing Card divination?', a: 'Tarot draws on rich archetypal imagery and is best for deep, psychological questions. Lenormand cards are read in combination for sharp, practical answers. Playing card divination is the fastest, best suited to quick yes/no questions.', category: 'tarot', order: 3 },
  { q: 'Which spread should I use?', a: 'Holy Triangle (3 cards) is a fast general read. Gypsy Cross (5 cards) suits relationship questions. Hexagram (7 cards) examines a specific problem from every angle. Solomon\u2019s Star (8 cards) is for deep, complex situations.', category: 'tarot', order: 4 },
  { q: 'Do I need to create an account?', a: 'You can draw a free basic reading without an account. Creating a free account lets you save your reading history and unlock detailed interpretations.', category: 'general', order: 5 },
  { q: 'How does the AI reading work?', a: 'Once cards (or a chart) are drawn, TaraWing sends the exact card meanings, spread positions, and your question to an AI model, which writes a personalized interpretation rather than pulling from a fixed template library.', category: 'general', order: 6 },
  { q: 'Can I get a PDF of my reading?', a: 'Yes, detailed readings can be exported as a PDF from your dashboard.', category: 'general', order: 7 },
  { q: 'Is TaraWing free?', a: 'Basic readings (Holy Triangle spread, single-card draws, Sun-sign summaries) are free. Detailed interpretations, deeper spreads, and full natal chart reports are unlocked through affordable one-time purchases.', category: 'pricing', order: 8 },
];

const ARTICLE_SEED = [
  {
    title: 'The Major Arcana, Briefly',
    slug: 'major-arcana-briefly',
    category: 'tarot',
    body: 'The 22 cards of the Major Arcana trace a symbolic journey — The Fool\u2019s first step, trials of will and fate, and the completion of The World. Unlike the Minor Arcana, which describes everyday events, Major Arcana cards tend to mark significant turning points, lessons, or archetypal forces at work in a reading.',
  },
  {
    title: 'What Your Sun, Moon, and Rising Sign Actually Mean',
    slug: 'sun-moon-rising-explained',
    category: 'astrology',
    body: 'Your Sun sign (based on your birth date) reflects core identity and how you shine. Your Moon sign (which needs birth time and place) reflects emotional instincts. Your Rising, or Ascendant, sign (which needs precise birth time) shapes first impressions and how you meet the world. All three come from the same birth chart but answer different questions.',
  },
  {
    title: 'Reading Lenormand in Pairs',
    slug: 'lenormand-pairs',
    category: 'tarot',
    body: 'Lenormand cards are traditionally read two at a time rather than in isolation — a single card sets a subject, and its neighbor modifies it. This pairing habit is what gives Lenormand its reputation for blunt, concrete, timing-focused answers rather than the layered symbolism of Tarot.',
  },
];

module.exports = { FAQ_SEED, ARTICLE_SEED };
