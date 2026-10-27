'use strict';
const { z } = require('zod');

const READING_TYPES = [
  'astrology_natal', 'tarot', 'lenormand', 'playing_cards',
  'holy_triangle', 'gypsy_cross', 'hexagram', 'solomon_star', 'seven_planets',
];

const S = {
  register: z.object({
    name: z.string().min(1).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  adminLogin: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  adminCreate: z.object({
    username: z.string().min(3).max(40),
    password: z.string().min(6).max(100),
    role: z.enum(['admin', 'super']).default('admin'),
    permissions: z.array(z.string()).default([]),
  }),
  idParam: z.object({ id: z.string().min(1) }),
  updateProfile: z.object({
    name: z.string().min(1).max(80).optional(),
    email: z.string().email().optional(),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6).max(100),
  }),

  createReading: z.object({
    type: z.enum(READING_TYPES),
    question: z.string().max(500).optional(),
    // Note: no `deck` field. Single-card draws use `type` itself as the
    // deck name ('tarot'/'lenormand'/'playing_cards'); Sacred Layout
    // spreads each have exactly one correct deck, enforced server-side in
    // cardService.SPREAD_DECK — never client-selectable.
    // Astrology natal chart
    birthDate: z.string().optional(),   // YYYY-MM-DD
    birthTime: z.string().optional(),   // HH:mm
    birthPlace: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    timezoneOffsetMinutes: z.number().optional(),
  }),

  // tier, not productCode: the price is looked up server-side from the
  // reading's category + the live settings.pricing blob, never supplied
  // by the client. See paymentService.resolvePriceCents.
  createOrder: z.object({
    readingId: z.string().min(1),
    tier: z.enum(['detail', 'deep_insights']),
  }),

  createConsult: z.object({
    name: z.string().max(80).optional(),
    contact: z.string().max(120).optional(),
    question: z.string().min(1).max(1000),
  }),

  articleSave: z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(200),
    category: z.string().min(1).max(60),
    body: z.string().min(1),
    published: z.boolean().default(true),
  }),
  faqSave: z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    category: z.string().default('general'),
    sortOrder: z.number().default(0),
  }),
  saveAiText: z.object({ text: z.string().min(1) }),

  // The site settings blob is intentionally free-form JSON (see
  // db/index.js seedSettings) so new fields don't require a migration —
  // but pricing/aiMechanism are validated here since they gate real money.
  siteSettings: z.object({
    siteName: z.string().min(1).max(100).optional(),
    tagline: z.string().max(200).optional(),
    donationEnabled: z.boolean().optional(),
    donationMessage: z.string().max(1000).optional(),
    supportEmail: z.string().email().optional(),
    pricing: z.object({
      tarot: z.object({ detail: z.number().int().min(0), deepInsights: z.number().int().min(0) }),
      astrology: z.object({ detail: z.number().int().min(0), deepInsights: z.number().int().min(0) }),
      spreads: z.object({ detail: z.number().int().min(0), deepInsights: z.number().int().min(0) }),
    }).optional(),
    aiMechanism: z.object({
      autoGenerateOnPayment: z.boolean(),
    }).optional(),
  }).passthrough(), // allow unknown fields through rather than stripping them silently
};

module.exports = { S, READING_TYPES };
