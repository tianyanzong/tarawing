'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getPdfReportContent,
  renderPdfTemplate,
  selectPdfTemplate,
} = require('../services/pdfService');

test('selects the Deep Insights report body and title', () => {
  const content = getPdfReportContent({
    type: 'tarot',
    detailed_report: 'Detailed body',
    deep_insights_report: 'Deep Insights body',
  }, 'tarot', 'deep_insights');

  assert.equal(content.title, 'Deep Insights Report — Tarot');
  assert.equal(content.body, 'Deep Insights body');
  assert.match(content.footer, /reflective guidance/);
});

test('keeps detailed report export unchanged by default', () => {
  const content = getPdfReportContent({
    type: 'tarot',
    detailed_report: 'Detailed body',
    deep_insights_report: 'Deep Insights body',
  }, 'tarot');

  assert.equal(content.title, 'Detailed Report — Tarot');
  assert.equal(content.body, 'Detailed body');
  assert.match(content.footer, /deterministic/);
});

test('selects the newest enabled PDF template for a report tier', () => {
  const selected = selectPdfTemplate([
    {
      kind: 'detail',
      status: 'enabled',
      content: 'older',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      kind: 'deep_insights',
      status: 'enabled',
      content: 'other tier',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      kind: 'detail',
      status: 'disabled',
      content: 'disabled',
      createdAt: '2026-04-01T00:00:00.000Z',
    },
    {
      kind: 'detail',
      status: 'enabled',
      content: 'newer',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ], 'detail');

  assert.equal(selected.content, 'newer');
  assert.equal(selectPdfTemplate([], 'detail'), null);
});

test('renders PDF template placeholders without changing report content', () => {
  const content = {
    title: 'Detailed Report — Tarot',
    body: 'The report body.',
    footer: 'Reflection only.',
  };
  const rendered = renderPdfTemplate({
    content: '{{title}}\n{{question}}\n{{report_body}}\n{{footer}}',
  }, content, {
    type: 'tarot',
    question: 'What next?',
    created_at: '2026-01-01T00:00:00.000Z',
  }, 'tarot');

  assert.match(rendered, /Detailed Report/);
  assert.match(rendered, /"What next\?"/);
  assert.match(rendered, /The report body\./);
  assert.match(rendered, /Reflection only\./);
});
