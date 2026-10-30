/**
 * Provider-agnostic Deep Insights generation.
 *
 * Enabled provider entries are stored in the admin settings JSON and tried in
 * order. No AI credentials are read from environment variables.
 */
'use strict';
const { logger } = require('../utils/logger');
const { decryptSecret } = require('./settingsSecurity');
const { getAiEndpoints } = require('./paymentService');

const DEFAULT_BASE_URL = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
};

function buildPrompt({ type, question, cards, chart }) {
  const lines = [];
  lines.push(`You are a warm, insightful diviner writing a personalized ${type.replace(/_/g, ' ')} reading for Tarawing, an astrology/tarot site.`);
  if (question) lines.push(`The querent's question: "${question}"`);
  if (cards && cards.length) {
    lines.push('Cards drawn:');
    for (const c of cards) {
      const cardName = c.card?.name || c.name;
      const orientation = c.card?.reversed != null ? (c.card.reversed ? ' (reversed)' : ' (upright)') : '';
      const meaning = c.card?.meaning || c.meaning;
      lines.push(`- ${c.position ? c.position + ': ' : ''}${cardName}${orientation} — ${meaning}`);
    }
  }
  if (chart) {
    lines.push('Natal chart data:');
    lines.push(`- Sun: ${chart.sun.sign} (${chart.sun.degreeInSign}\u00b0)`);
    lines.push(`- Moon: ${chart.moon.sign} (${chart.moon.degreeInSign}\u00b0)`);
    if (chart.ascendant) lines.push(`- Ascendant: ${chart.ascendant.sign} (${chart.ascendant.degreeInSign}\u00b0)`);
  }
  lines.push('');
  lines.push('Write a cohesive, specific interpretation (roughly 400-600 words) that weaves the positions/cards or chart points together into one narrative rather than listing them mechanically. Be honest and grounded rather than vague — avoid generic filler that could apply to anyone. Do not diagnose medical, legal, or financial matters; frame guidance as reflection, not certainty.');
  return lines.join('\n');
}

function providerUrl(endpoint) {
  const defaultBase = DEFAULT_BASE_URL[endpoint.adapter];
  const rawBase = endpoint.baseUrl || defaultBase;
  if (!rawBase) throw new Error(`Unsupported AI provider adapter: ${endpoint.adapter}`);

  const url = new URL(rawBase);
  if (url.protocol !== 'https:') throw new Error('AI provider base URLs must use HTTPS.');

  let path = url.pathname.replace(/\/+$/, '');
  if (endpoint.adapter === 'anthropic') {
    if (!path.endsWith('/v1/messages')) {
      path = path.endsWith('/v1') ? `${path}/messages` : `${path}/v1/messages`;
    }
  } else if (['openai', 'deepseek', 'openai_compatible'].includes(endpoint.adapter)) {
    if (!path.endsWith('/chat/completions')) {
      path = path.endsWith('/v1') ? `${path}/chat/completions` : `${path}/v1/chat/completions`;
    }
  } else {
    throw new Error(`Unsupported AI provider adapter: ${endpoint.adapter}`);
  }

  url.pathname = path;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function buildProviderRequest(endpoint, prompt, apiKey) {
  const url = providerUrl(endpoint);
  if (endpoint.adapter === 'anthropic') {
    return {
      url,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: endpoint.model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      },
    };
  }

  return {
    url,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: {
      model: endpoint.model,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    },
  };
}

function extractProviderText(adapter, responseBody) {
  if (adapter === 'anthropic') {
    return (responseBody.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  }
  return String(responseBody.choices?.[0]?.message?.content || '').trim();
}

async function generateAiReading(payload, dependencies = {}) {
  const loadEndpoints = dependencies.loadEndpoints || getAiEndpoints;
  const fetchImpl = dependencies.fetchImpl || global.fetch;
  const log = dependencies.logger || logger;
  const prompt = typeof payload.prompt === 'string' && payload.prompt.trim()
    ? payload.prompt.trim()
    : buildPrompt(payload);

  let endpoints;
  try {
    endpoints = await loadEndpoints();
  } catch (err) {
    log.error('Could not load AI provider settings', { err });
    return { ok: false, error: 'Could not load AI provider settings.' };
  }

  const candidates = (Array.isArray(endpoints) ? endpoints : [])
    .filter((endpoint) => endpoint?.enabled && endpoint?.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (candidates.length === 0) {
    return { ok: false, error: 'No enabled AI providers are configured.' };
  }

  let attempts = 0;
  for (const endpoint of candidates) {
    if (!endpoint.apiKeyEncrypted) {
      log.error('AI provider has no API key', {
        providerId: endpoint.id,
        providerName: endpoint.name,
      });
      continue;
    }

    attempts += 1;
    try {
      const apiKey = decryptSecret(endpoint.apiKeyEncrypted);
      const request = buildProviderRequest(endpoint, prompt, apiKey);
      const response = await fetchImpl(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
      });

      if (!response.ok) {
        log.error('AI provider returned an error', {
          providerId: endpoint.id,
          providerName: endpoint.name,
          status: response.status,
        });
        continue;
      }

      const raw = await response.text();
      let responseBody;
      try {
        responseBody = JSON.parse(raw);
      } catch {
        log.error('AI provider returned malformed JSON', {
          providerId: endpoint.id,
          providerName: endpoint.name,
        });
        continue;
      }

      const text = extractProviderText(endpoint.adapter, responseBody);
      if (!text) {
        log.error('AI provider returned empty text', {
          providerId: endpoint.id,
          providerName: endpoint.name,
        });
        continue;
      }

      return {
        ok: true,
        text,
        providerId: endpoint.id,
        providerName: endpoint.name,
      };
    } catch (err) {
      log.error('AI provider attempt failed', {
        err,
        providerId: endpoint.id,
        providerName: endpoint.name,
      });
    }
  }

  if (attempts === 0) {
    return { ok: false, error: 'Enabled AI providers do not have API keys configured.' };
  }
  return {
    ok: false,
    error: 'All enabled AI providers failed. Check Admin > Settings > AI mechanism.',
  };
}

module.exports = {
  buildPrompt,
  buildProviderRequest,
  extractProviderText,
  generateAiReading,
};
