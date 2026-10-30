'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SETTINGS_ENCRYPTION_KEY = 'test-settings-encryption-key';

const {
  buildProviderRequest,
  generateAiReading,
} = require('../services/aiReading');
const { encryptSecret } = require('../services/settingsSecurity');

const silentLogger = { info() {}, warn() {}, debug() {}, error() {} };

function endpoint(overrides) {
  return {
    id: 'aip_test',
    name: 'Test provider',
    adapter: 'openai',
    model: 'test-model',
    enabled: true,
    order: 0,
    apiKeyEncrypted: encryptSecret('sk-test-secret'),
    ...overrides,
  };
}

test('falls back to the next enabled provider in configured order', async () => {
  const attempts = [];
  const fetchImpl = async (url) => {
    attempts.push(url);
    if (url.includes('anthropic')) {
      return new Response('provider unavailable', { status: 500 });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Second provider answer' } }],
    }), { status: 200 });
  };

  const result = await generateAiReading(
    { type: 'tarot', question: 'Test', cards: [] },
    {
      fetchImpl,
      logger: silentLogger,
      loadEndpoints: async () => [
        endpoint({
          id: 'aip_anth',
          name: 'Anthropic primary',
          adapter: 'anthropic',
          order: 0,
        }),
        endpoint({
          id: 'aip_openai',
          name: 'OpenAI backup',
          adapter: 'openai',
          model: 'gpt-4.1-mini',
          order: 1,
        }),
      ],
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.text, 'Second provider answer');
  assert.equal(result.providerId, 'aip_openai');
  assert.equal(result.providerName, 'OpenAI backup');
  assert.equal(attempts.length, 2);
});

test('ignores disabled providers and skips missing encrypted keys', async () => {
  const urls = [];
  const result = await generateAiReading(
    { type: 'tarot', cards: [] },
    {
      fetchImpl: async (url) => {
        urls.push(url);
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'Enabled answer' } }],
        }), { status: 200 });
      },
      logger: silentLogger,
      loadEndpoints: async () => [
        endpoint({ id: 'disabled', enabled: false }),
        endpoint({ id: 'missing-key', apiKeyEncrypted: '' }),
        endpoint({ id: 'enabled', name: 'Enabled', order: 2 }),
      ],
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.providerId, 'enabled');
  assert.equal(urls.length, 1);
});

test('builds Anthropic and custom OpenAI-compatible requests', () => {
  const anthropic = buildProviderRequest(
    endpoint({
      adapter: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-test',
    }),
    'Prompt',
    'sk-anthropic',
  );
  const custom = buildProviderRequest(
    endpoint({
      adapter: 'openai_compatible',
      baseUrl: 'https://ai.example.com/v1',
      model: 'custom-model',
    }),
    'Prompt',
    'sk-custom',
  );

  assert.equal(anthropic.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(anthropic.headers['x-api-key'], 'sk-anthropic');
  assert.equal(custom.url, 'https://ai.example.com/v1/chat/completions');
  assert.equal(custom.headers.authorization, 'Bearer sk-custom');
  assert.equal(custom.body.model, 'custom-model');
});

test('returns a redacted aggregate error when every provider fails', async () => {
  const result = await generateAiReading(
    { type: 'tarot', cards: [] },
    {
      fetchImpl: async () => new Response('bad key sk-test-secret', { status: 401 }),
      logger: silentLogger,
      loadEndpoints: async () => [
        endpoint({ id: 'a', name: 'Provider A', order: 0 }),
        endpoint({ id: 'b', name: 'Provider B', order: 1 }),
      ],
    },
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /all enabled ai providers failed/i);
  assert.equal(result.error.includes('sk-test-secret'), false);
});
