'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { getPaymentMethodById } = require('../services/paymentService');

function databaseWith(methods) {
  return {
    one: async () => ({
      value: {
        paymentMethods: methods,
      },
    }),
  };
}

test('returns only an enabled QR payment method', async () => {
  const method = {
    id: 'pm_paypal',
    name: 'PayPal',
    enabled: true,
    qrImage: 'data:image/png;base64,iVBORw0KGgo=',
    order: 0,
  };
  const found = await getPaymentMethodById(databaseWith([method]), method.id);
  const disabled = await getPaymentMethodById(databaseWith([{ ...method, enabled: false }]), method.id);

  assert.deepEqual(found, method);
  assert.equal(disabled, null);
});
