/**
 * server/services/aiReading.js
 * Combines card meanings / spread positions / chart data + the user's
 * question into a prompt for Claude, producing a bespoke interpretation
 * instead of static templated text. Degrades gracefully (clear error, no
 * crash) if ANTHROPIC_API_KEY isn't configured — same pattern as the
 * reference project's ai-report.js.
 */
'use strict';
const { logger } = require('../utils/logger');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

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

async function generateAiReading(payload) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured. AI readings are unavailable until it is set.' };
  }
  const prompt = buildPrompt(payload);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error('Anthropic API error', { status: res.status, body: text });
      return { ok: false, error: `AI provider returned ${res.status}.` };
    }
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return { ok: true, text };
  } catch (err) {
    logger.error('AI reading generation failed', { err });
    return { ok: false, error: 'AI reading generation failed unexpectedly.' };
  }
}

module.exports = { generateAiReading, buildPrompt };
