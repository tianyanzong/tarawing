'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  seededEmailTemplates,
  seededPdfTemplates,
} = require('../data/defaultTemplates');

test('seeds one enabled template for every system email event', () => {
  const templates = seededEmailTemplates('2026-11-08T00:00:00.000Z');

  assert.deepEqual(
    templates.map((template) => template.kind).sort(),
    ['email_verification', 'password_reset', 'report_ready'],
  );
  assert.ok(templates.every((template) => template.status === 'enabled'));
  assert.equal(new Set(templates.map((template) => template.id)).size, templates.length);
});

test('seeds one enabled template for both PDF report tiers', () => {
  const templates = seededPdfTemplates('2026-11-08T00:00:00.000Z');

  assert.deepEqual(templates.map((template) => template.kind).sort(), ['deep_insights', 'detail']);
  assert.ok(templates.every((template) => template.status === 'enabled'));
  assert.ok(templates.every((template) => template.content.includes('{{report_body}}')));
});
