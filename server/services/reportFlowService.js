'use strict';

const DETAIL_UNPAID = 'detail_unpaid';
const DETAIL_TOBEPAID = 'detail_tobepaid';
const DETAIL_PAID = 'detail_paid';
const DEEP_INSIGHTS_TOBEPAID = 'deep_insights_tobepaid';

function detailAccessFromStatus(status) {
  return {
    accessible: [DETAIL_UNPAID, DETAIL_TOBEPAID, DETAIL_PAID, 'detail_unlocked'].includes(status),
    paid: status === DETAIL_PAID,
  };
}

function canGenerateDeepInsights(status) {
  return status === DETAIL_PAID;
}

function verificationStatusForTier(tier) {
  if (tier === 'detail') return DETAIL_TOBEPAID;
  if (tier === 'deep_insights') return DEEP_INSIGHTS_TOBEPAID;
  throw new Error(`Unknown report tier: ${tier}`);
}

function submittedOrderStatus(orderStatus) {
  if (orderStatus === DETAIL_TOBEPAID) return 'detail';
  if (orderStatus === DEEP_INSIGHTS_TOBEPAID) return 'deep_insights';
  return null;
}

function isSubmittedOrderStatus(orderStatus) {
  return submittedOrderStatus(orderStatus) !== null;
}

module.exports = {
  DEEP_INSIGHTS_TOBEPAID,
  DETAIL_PAID,
  DETAIL_TOBEPAID,
  DETAIL_UNPAID,
  canGenerateDeepInsights,
  detailAccessFromStatus,
  isSubmittedOrderStatus,
  submittedOrderStatus,
  verificationStatusForTier,
};
