/**
 * server/services/paymentService.js
 *
 * Pricing is admin-configurable per category/tier (see db/index.js
 * seedSettings → settings.pricing), not a static price list — this file
 * resolves the live price at order-creation time and reads the enabled QR
 * payment methods. Paid status is granted only by an admin verification route,
 * never by a customer-side payment simulation.
 */
'use strict';
const { CATEGORIES } = require('../data/categories');

const TIERS = ['detail', 'deep_insights'];
const TIER_LABEL = { detail: 'Detailed Report', deep_insights: 'Deep Insights Report' };

// Used only if settings.pricing is somehow missing a category/tier —
// should never happen once seedSettings has run, but a request shouldn't
// 500 just because of a partially-edited settings blob.
const FALLBACK_CENTS = { detail: 299, deep_insights: 499 };

function productCode(category, tier) {
  return `${tier}_${category}`;
}

function parseProductCode(code) {
  for (const tier of TIERS) {
    if (code.startsWith(`${tier}_`)) {
      const category = code.slice(tier.length + 1);
      if (CATEGORIES.includes(category)) return { tier, category };
    }
  }
  return null;
}

/** Reads the live price (cents) for a category/tier from settings.pricing. */
async function resolvePriceCents(db, category, tier) {
  if (!CATEGORIES.includes(category)) throw new Error(`Unknown category: ${category}`);
  if (!TIERS.includes(tier)) throw new Error(`Unknown tier: ${tier}`);
  const row = await db.one("SELECT value FROM settings WHERE key='site'");
  const pricing = row?.value?.pricing;
  const tierKey = tier === 'deep_insights' ? 'deepInsights' : tier; // settings JSON uses camelCase
  const cents = pricing?.[category]?.[tierKey];
  return Number.isFinite(cents) ? cents : FALLBACK_CENTS[tier];
}

async function getAiMechanismSettings(db) {
  const row = await db.one("SELECT value FROM settings WHERE key='site'");
  return row?.value?.aiMechanism || { autoGenerateOnPayment: true };
}

async function getAiEndpoints(db) {
  const mechanism = await getAiMechanismSettings(db);
  if (!Array.isArray(mechanism.endpoints)) return [];
  return mechanism.endpoints
    .filter((endpoint) => endpoint?.enabled && endpoint?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getPaymentMethodById(db, paymentMethodId) {
  const row = await db.one("SELECT value FROM settings WHERE key='site'");
  const methods = row?.value?.paymentMethods;
  if (!Array.isArray(methods)) return null;
  return methods.find((method) => (
    method?.id === paymentMethodId
    && method.enabled
    && typeof method.qrImage === 'string'
    && method.qrImage
  )) || null;
}

module.exports = {
  TIERS, TIER_LABEL, productCode, parseProductCode,
  resolvePriceCents, getAiEndpoints, getAiMechanismSettings, getPaymentMethodById,
};
