'use strict';

const DEMO_USER = {
  name: 'Demo Stargazer',
  email: 'demo@tarawing.app',
  password: 'demo2026',
};

const DEMO_READINGS = [
  {
    id: 'demo_rd_tarot_fool',
    type: 'tarot',
    question: 'What should I focus on this week?',
    status: 'new',
    inputData: { type: 'tarot', question: 'What should I focus on this week?' },
    resultBasic: {
      deck: 'tarot',
      cards: [{
        position: 'Draw',
        card: {
          name: 'The Fool',
          meaning: 'New beginnings, innocence, a leap of faith into the unknown.',
          reversed: false,
          arcana: 'major',
          num: 0,
        },
      }],
    },
    simpleReport: 'The Fool points to a beginning that becomes clearer through action. Make room for one small experiment this week.',
    detailedReport: null,
    deepInsightsReport: null,
    createdAt: '2026-10-20T09:00:00.000Z',
  },
  {
    id: 'demo_rd_lenormand_pair',
    type: 'lenormand_pair',
    question: 'Which opportunity deserves my attention?',
    status: 'new',
    inputData: { type: 'lenormand_pair', question: 'Which opportunity deserves my attention?' },
    resultBasic: {
      spread: 'lenormand_pair',
      label: 'Lenormand Pair',
      deck: 'lenormand',
      cards: [
        {
          position: 'Subject',
          card: {
            n: 22,
            name: 'Crossroad',
            meaning: 'A choice, options, a decision point.',
          },
        },
        {
          position: 'Modifier',
          card: {
            n: 1,
            name: 'Rider',
            meaning: 'News, messages, something arriving soon.',
          },
        },
      ],
    },
    simpleReport: 'Crossroad sets the subject: a decision is already in front of you. Rider modifies it with movement and incoming news, so compare the practical cost before choosing.',
    detailedReport: null,
    deepInsightsReport: null,
    createdAt: '2026-10-21T09:00:00.000Z',
  },
  {
    id: 'demo_rd_holy_triangle',
    type: 'holy_triangle',
    question: 'How can I move this project forward?',
    status: 'detail_paid',
    inputData: { type: 'holy_triangle', question: 'How can I move this project forward?' },
    resultBasic: {
      spread: 'holy_triangle',
      label: 'Holy Triangle',
      deck: 'tarot',
      cards: [
        {
          position: 'Past',
          card: {
            name: 'The Hermit',
            meaning: 'Introspection, solitude, seeking inner guidance.',
            reversed: false,
            arcana: 'major',
            num: 9,
          },
        },
        {
          position: 'Present',
          card: {
            name: 'Two of Wands',
            meaning: 'A choice or partnership forming around passion, ambition, and creative drive.',
            reversed: false,
            arcana: 'minor',
            suit: 'wands',
            rank: 'Two',
          },
        },
        {
          position: 'Future',
          card: {
            name: 'The Sun',
            meaning: 'Clarity, vitality, success plainly visible.',
            reversed: false,
            arcana: 'major',
            num: 19,
          },
        },
      ],
    },
    simpleReport: 'The spread moves from private reflection to a deliberate choice, then visible progress. The next step is to name the option you are avoiding.',
    detailedReport: 'The Hermit shows useful preparation, but Two of Wands turns that reflection into a decision. The Sun suggests the result becomes clearer once you make that choice public and commit to a deadline.',
    deepInsightsReport: 'The project does not need more research first. It needs one visible commitment. Choose the direction that can survive contact with reality, announce the next milestone, and let the result teach you the rest.',
    createdAt: '2026-10-22T09:00:00.000Z',
  },
  {
    id: 'demo_rd_astrology_natal',
    type: 'astrology_natal',
    question: 'What should I understand about my current chapter?',
    status: 'new',
    inputData: {
      type: 'astrology_natal',
      birthDate: '1992-04-18',
      birthTime: '08:30',
      latitude: -33.8688,
      longitude: 151.2093,
      timezoneOffsetMinutes: 600,
    },
    resultBasic: {
      utcDate: '1992-04-17T22:30:00.000Z',
      sun: { sign: 'Aries', degreeInSign: 28.4, longitude: 28.4 },
      moon: { sign: 'Cancer', degreeInSign: 12.7, longitude: 102.7 },
      ascendant: { sign: 'Taurus', degreeInSign: 18.2, longitude: 48.2 },
      caveats: ['Moon position is approximate to roughly +/-0.3-0.6 degrees.'],
      planetsNote: 'Sun, Moon, and Ascendant only. Mercury-Saturn positions are not implemented.',
    },
    simpleReport: 'Aries Sun, Cancer Moon, and Taurus Rising combine momentum with a strong need for emotional and material stability.',
    detailedReport: null,
    deepInsightsReport: null,
    createdAt: '2026-10-23T09:00:00.000Z',
  },
  {
    id: 'demo_rd_playing_card',
    type: 'playing_cards',
    question: 'Will the negotiation move forward?',
    status: 'detail_unpaid',
    inputData: { type: 'playing_cards', question: 'Will the negotiation move forward?' },
    resultBasic: {
      deck: 'playing_cards',
      cards: [{
        position: 'Draw',
        card: {
          name: 'Ace of Spades',
          meaning: 'Points to a fresh start or turning point in challenge, effort, and hard truth.',
          suit: 'Spades',
          rank: 'A',
        },
      }],
    },
    simpleReport: 'Ace of Spades favors a clear, direct reset rather than preserving ambiguity. Put the non-negotiable point on the table.',
    detailedReport: 'The negotiation can move, but only after the unresolved issue is named plainly. Expect the conversation to feel sharp before it feels useful.',
    deepInsightsReport: null,
    createdAt: '2026-10-24T09:00:00.000Z',
  },
  {
    id: 'demo_rd_gypsy_cross',
    type: 'gypsy_cross',
    question: 'What is blocking a calmer routine?',
    status: 'detail_unpaid',
    inputData: { type: 'gypsy_cross', question: 'What is blocking a calmer routine?' },
    resultBasic: {
      spread: 'gypsy_cross',
      label: 'Gypsy Cross',
      deck: 'playing_cards_36',
      cards: [
        { position: 'Situation', card: { name: '8 of Clubs', meaning: 'Momentum building around work, ambition, and communication.', suit: 'Clubs', rank: '8' } },
        { position: 'Obstacle', card: { name: 'King of Diamonds', meaning: 'An authoritative influence steering money and material matters.', suit: 'Diamonds', rank: 'K' } },
        { position: 'Past', card: { name: '9 of Hearts', meaning: 'A wish nearing fulfillment in love and relationships.', suit: 'Hearts', rank: '9' } },
        { position: 'Future', card: { name: '6 of Spades', meaning: 'Harmony returning to challenge, effort, and hard truth.', suit: 'Spades', rank: '6' } },
        { position: 'Outcome', card: { name: 'Queen of Clubs', meaning: 'An intuitive, nurturing influence guiding work, ambition, and communication.', suit: 'Clubs', rank: 'Q' } },
      ],
    },
    simpleReport: 'The obstacle is structural rather than emotional. A clearer boundary around time or money will do more than another burst of effort.',
    detailedReport: 'The spread shows momentum that is being redirected by an authority or material constraint. The outcome improves when communication becomes explicit and the routine is protected by a boundary, not a mood.',
    deepInsightsReport: null,
    createdAt: '2026-10-25T09:00:00.000Z',
  },
];

const DEMO_ORDERS = [
  {
    id: 'demo_order_detail_spreads',
    readingId: 'demo_rd_holy_triangle',
    productCode: 'detail_spreads',
    amountCents: 399,
    channel: 'sandbox',
    status: 'paid',
    paidAt: '2026-10-22T09:10:00.000Z',
    createdAt: '2026-10-22T09:05:00.000Z',
  },
  {
    id: 'demo_order_deep_spreads',
    readingId: 'demo_rd_holy_triangle',
    productCode: 'deep_insights_spreads',
    amountCents: 599,
    channel: 'sandbox',
    status: 'paid',
    paidAt: '2026-10-22T09:20:00.000Z',
    createdAt: '2026-10-22T09:15:00.000Z',
  },
  {
    id: 'demo_order_pending_astrology',
    readingId: 'demo_rd_astrology_natal',
    productCode: 'detail_astrology',
    amountCents: 599,
    channel: null,
    status: 'pending',
    paidAt: null,
    createdAt: '2026-10-23T09:10:00.000Z',
  },
];

const DEMO_NOTIFICATIONS = [
  {
    id: 'demo_notice_detail_ready',
    type: 'payment',
    message: 'Your payment was received - the detailed report is now unlocked.',
    isRead: false,
    createdAt: '2026-10-22T09:10:00.000Z',
  },
  {
    id: 'demo_notice_deep_ready',
    type: 'payment',
    message: 'Your Deep Insights report is ready.',
    isRead: false,
    createdAt: '2026-10-22T09:20:00.000Z',
  },
  {
    id: 'demo_notice_astrology_pending',
    type: 'order',
    message: 'Your astrology detailed report order is awaiting sandbox payment.',
    isRead: true,
    createdAt: '2026-10-23T09:10:00.000Z',
  },
];

const DEMO_CONSULTATIONS = [
  {
    id: 'demo_consultation_progress',
    name: 'Demo Stargazer',
    contact: 'demo@tarawing.app',
    question: 'How should I use the current reading in a practical way?',
    status: 'answered',
    adminReply: 'Choose one concrete action within 48 hours, then review what changed before drawing again.',
    createdAt: '2026-10-24T10:00:00.000Z',
  },
];

module.exports = {
  DEMO_USER,
  DEMO_READINGS,
  DEMO_ORDERS,
  DEMO_NOTIFICATIONS,
  DEMO_CONSULTATIONS,
};
