'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DETAIL_PAID,
  DETAIL_TOBEPAID,
  DETAIL_UNPAID,
  canGenerateDeepInsights,
  detailAccessFromStatus,
  submittedOrderStatus,
  verificationStatusForTier,
} = require('../services/reportFlowService');
const { S } = require('../schemas');

test('maps report statuses to detail access and paid entitlement', () => {
  assert.deepEqual(detailAccessFromStatus('new'), { accessible: false, paid: false });
  assert.deepEqual(detailAccessFromStatus(DETAIL_UNPAID), { accessible: true, paid: false });
  assert.deepEqual(detailAccessFromStatus(DETAIL_TOBEPAID), { accessible: true, paid: false });
  assert.deepEqual(detailAccessFromStatus(DETAIL_PAID), { accessible: true, paid: true });
});

test('Deep Insights requires a verified detail payment', () => {
  assert.equal(canGenerateDeepInsights('new'), false);
  assert.equal(canGenerateDeepInsights(DETAIL_UNPAID), false);
  assert.equal(canGenerateDeepInsights(DETAIL_TOBEPAID), false);
  assert.equal(canGenerateDeepInsights(DETAIL_PAID), true);
});

test('maps payment tiers to submitted and verified states', () => {
  assert.equal(verificationStatusForTier('detail'), DETAIL_TOBEPAID);
  assert.equal(verificationStatusForTier('deep_insights'), 'deep_insights_tobepaid');
  assert.equal(submittedOrderStatus(DETAIL_TOBEPAID), 'detail');
  assert.equal(submittedOrderStatus('deep_insights_tobepaid'), 'deep_insights');
  assert.equal(submittedOrderStatus('pending'), null);
});

test('requires a payment method when submitting a QR payment', () => {
  assert.equal(S.submitPayment.safeParse({ paymentMethodId: 'pm_paypal' }).success, true);
  assert.equal(S.submitPayment.safeParse({ paymentMethodId: '' }).success, false);
});
