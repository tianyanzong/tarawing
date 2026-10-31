'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { getPdfReportContent } = require('../services/pdfService');

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
