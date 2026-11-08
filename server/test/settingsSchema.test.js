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

test('accepts SMTP settings and defaults verification to optional', () => {
  const parsed = S.siteSettings.parse({
    requireEmailVerification: true,
    smtp: {
      enabled: true,
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      username: 'mailer',
      password: 'secret',
      fromName: 'Tarawing',
      fromEmail: 'hello@tarawing.app',
      replyTo: '',
      publicSiteUrl: 'https://tarawing.app',
    },
  });

  assert.equal(parsed.requireEmailVerification, true);
  assert.equal(parsed.smtp.port, 587);
  assert.equal(parsed.smtp.password, 'secret');
});

test('rejects invalid SMTP ports and public site protocols', () => {
  const base = {
    enabled: true,
    host: 'smtp.example.com',
    port: 70000,
    secure: false,
    username: '',
    fromName: 'Tarawing',
    fromEmail: 'hello@tarawing.app',
    replyTo: '',
    publicSiteUrl: 'ftp://tarawing.app',
  };
  const invalidPort = S.siteSettings.safeParse({ smtp: base });
  const invalidProtocol = S.siteSettings.safeParse({
    smtp: { ...base, port: 587, publicSiteUrl: 'ftp://tarawing.app' },
  });

  assert.equal(invalidPort.success, false);
  assert.equal(invalidProtocol.success, false);
});

test('accepts email and PDF templates and rejects unknown template kinds', () => {
  const timestamp = new Date().toISOString();
  const valid = S.siteSettings.safeParse({
    emailTemplates: [{
      id: 'eml_1',
      name: 'Verification',
      kind: 'email_verification',
      status: 'enabled',
      subject: 'Verify {{site_name}}',
      body: 'Open {{action_url}}',
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
    pdfTemplates: [{
      id: 'pdf_1',
      name: 'Detailed',
      kind: 'detail',
      status: 'disabled',
      content: '{{report_body}}',
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
  });
  const invalid = S.siteSettings.safeParse({
    emailTemplates: [{
      id: 'eml_bad',
      name: 'Bad',
      kind: 'marketing',
      status: 'enabled',
      subject: 'Bad',
      body: 'Bad',
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test('accepts freeform templates and validates admin contact emails', () => {
  const timestamp = new Date().toISOString();
  const settings = S.siteSettings.safeParse({
    freeformTemplates: [{
      id: 'free_1',
      name: 'Check in',
      subject: 'Hello {{name}}',
      body: 'A message for {{email}}.',
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
  });
  const contact = S.contactUser.safeParse({
    subject: 'Hello',
    body: 'Message body',
  });
  const emptyContact = S.contactUser.safeParse({ subject: '', body: '' });

  assert.equal(settings.success, true);
  assert.equal(contact.success, true);
  assert.equal(emptyContact.success, false);
});

test('validates monitor dates, event types, and result limits', () => {
  const valid = S.monitorQuery.safeParse({
    from: '2026-11-01T00:00:00.000Z',
    to: '2026-11-09T00:00:00.000Z',
    eventType: 'email.password_reset.error',
    limit: '50',
  });
  const invalidDate = S.monitorQuery.safeParse({ from: '2026-11-01' });
  const invalidLimit = S.monitorQuery.safeParse({ limit: '500' });

  assert.equal(valid.success, true);
  assert.equal(valid.data.limit, 50);
  assert.equal(invalidDate.success, false);
  assert.equal(invalidLimit.success, false);
});
