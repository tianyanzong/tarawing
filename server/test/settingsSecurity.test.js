'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SETTINGS_ENCRYPTION_KEY = 'test-settings-encryption-key';

const {
  auditSettings,
  decryptSecret,
  encryptSecret,
  mergeAiEndpoints,
  publicPaymentMethods,
  publicSettings,
  sanitizeAiEndpointsForAdmin,
} = require('../services/settingsSecurity');

test('encrypts and decrypts an API key without retaining plaintext', () => {
  const encrypted = encryptSecret('sk-test-secret');

  assert.match(encrypted, /^enc:v1:/);
  assert.equal(encrypted.includes('sk-test-secret'), false);
  assert.equal(decryptSecret(encrypted), 'sk-test-secret');
  assert.notEqual(encryptSecret('sk-test-secret'), encrypted);
});

test('rejects tampered encrypted secrets', () => {
  const encrypted = encryptSecret('sk-test-secret');
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('a') ? 'b' : 'a'}`;

  assert.throws(() => decryptSecret(tampered), /could not be decrypted/i);
});

test('sanitizes endpoints and preserves existing keys when replacement is blank', () => {
  const existing = [{
    id: 'aip_1',
    name: 'OpenAI',
    adapter: 'openai',
    model: 'gpt-4.1-mini',
    enabled: true,
    order: 0,
    apiKeyEncrypted: encryptSecret('sk-old'),
  }];

  const merged = mergeAiEndpoints([{
    id: 'aip_1',
    name: 'OpenAI primary',
    adapter: 'openai',
    model: 'gpt-4.1',
    enabled: true,
    order: 0,
  }], existing);

  assert.equal(decryptSecret(merged[0].apiKeyEncrypted), 'sk-old');
  assert.equal(merged[0].name, 'OpenAI primary');

  const sanitized = sanitizeAiEndpointsForAdmin(merged);
  assert.equal(sanitized[0].hasApiKey, true);
  assert.equal('apiKeyEncrypted' in sanitized[0], false);
  assert.equal('apiKey' in sanitized[0], false);
});

test('replaces an existing key only when a non-empty apiKey is supplied', () => {
  const existing = [{
    id: 'aip_1',
    name: 'DeepSeek',
    adapter: 'deepseek',
    model: 'deepseek-chat',
    enabled: true,
    order: 0,
    apiKeyEncrypted: encryptSecret('sk-old'),
  }];

  const merged = mergeAiEndpoints([{
    id: 'aip_1',
    name: 'DeepSeek',
    adapter: 'deepseek',
    model: 'deepseek-chat',
    enabled: true,
    order: 0,
    apiKey: 'sk-new',
  }], existing);

  assert.equal(decryptSecret(merged[0].apiKeyEncrypted), 'sk-new');
});

test('public settings omit AI credentials, pricing, and payment records', () => {
  const result = publicSettings({
    siteName: 'Tarawing',
    tagline: 'Tagline',
    supportEmail: 'support@tarawing.app',
    donationEnabled: true,
    donationMessage: 'Support us',
    pricing: { tarot: { detail: 100 } },
    aiMechanism: { endpoints: [{ apiKeyEncrypted: 'enc:v1:secret' }] },
    paymentMethods: [{ id: 'pm_1', qrImage: 'data:image/png;base64,secret' }],
  });

  assert.deepEqual(result, {
    siteName: 'Tarawing',
    tagline: 'Tagline',
    supportEmail: 'support@tarawing.app',
    donationEnabled: true,
    donationMessage: 'Support us',
  });
});

test('publishes only enabled QR methods and redacts audit settings', () => {
  const settings = {
    siteName: 'Tarawing',
    pricing: { tarot: { detail: 100 } },
    aiMechanism: {
      autoGenerateOnPayment: true,
      endpoints: [{
        id: 'aip_1',
        name: 'OpenAI',
        adapter: 'openai',
        model: 'gpt',
        enabled: true,
        order: 0,
        apiKeyEncrypted: encryptSecret('sk-secret'),
      }],
    },
    paymentMethods: [
      {
        id: 'pm_paypal',
        name: 'PayPal',
        enabled: true,
        order: 0,
        qrImage: 'data:image/png;base64,iVBORw0KGgo=',
      },
      {
        id: 'pm_hidden',
        name: 'Hidden',
        enabled: false,
        order: 1,
        qrImage: 'data:image/png;base64,iVBORw0KGgo=',
      },
    ],
  };

  assert.deepEqual(publicPaymentMethods(settings).map((method) => method.id), ['pm_paypal']);
  const audit = auditSettings(settings);
  assert.equal(JSON.stringify(audit).includes('sk-secret'), false);
  assert.equal(JSON.stringify(audit).includes('data:image'), false);
  assert.equal(audit.paymentMethods[0].name, 'PayPal');
});
