'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { S } = require('../schemas');

const endpoint = {
  id: 'aip_1',
  name: 'Custom provider',
  adapter: 'openai_compatible',
  model: 'custom-model',
  baseUrl: 'https://ai.example.com/v1',
  apiKey: 'sk-test',
  enabled: true,
  order: 0,
};

test('accepts ordered AI endpoints and strips stored encrypted fields', () => {
  const parsed = S.siteSettings.parse({
    aiMechanism: {
      autoGenerateOnPayment: true,
      endpoints: [{ ...endpoint, apiKeyEncrypted: 'enc:v1:not-allowed' }],
    },
  });

  assert.equal(parsed.aiMechanism.endpoints[0].name, 'Custom provider');
  assert.equal(parsed.aiMechanism.endpoints[0].apiKey, 'sk-test');
  assert.equal(parsed.aiMechanism.endpoints[0].apiKeyEncrypted, undefined);
});

test('rejects insecure custom AI base URLs', () => {
  const result = S.siteSettings.safeParse({
    aiMechanism: {
      autoGenerateOnPayment: true,
      endpoints: [{ ...endpoint, baseUrl: 'http://localhost:8080/v1' }],
    },
  });

  assert.equal(result.success, false);
});

test('accepts supported QR images and rejects other image types', () => {
  const base = {
    id: 'pm_1',
    name: 'PayPal',
    enabled: true,
    order: 0,
  };
  const png = S.siteSettings.safeParse({
    paymentMethods: [{ ...base, qrImage: 'data:image/png;base64,iVBORw0KGgo=' }],
  });
  const svg = S.siteSettings.safeParse({
    paymentMethods: [{ ...base, qrImage: 'data:image/svg+xml;base64,PHN2Zz4=' }],
  });

  assert.equal(png.success, true);
  assert.equal(svg.success, false);
});
