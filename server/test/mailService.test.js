'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SETTINGS_ENCRYPTION_KEY = 'test-settings-encryption-key';

const {
  MailNotConfiguredError,
  buildContactEmail,
  buildPasswordResetEmail,
  buildReportReadyEmail,
  buildTestEmail,
  buildVerificationEmail,
  selectEmailTemplate,
  sendContactEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require('../services/mailService');
const { encryptSecret } = require('../services/settingsSecurity');

function smtp(overrides = {}) {
  return {
    enabled: true,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'mailer',
    passwordEncrypted: encryptSecret('smtp-password'),
    fromName: 'Tarawing <Support>',
    fromEmail: 'hello@tarawing.app',
    replyTo: 'support@tarawing.app',
    publicSiteUrl: 'https://tarawing.app',
    ...overrides,
  };
}

test('builds password-reset and verification links from public site URL', () => {
  const reset = buildPasswordResetEmail(smtp(), 'reader@example.com', 'reset-token');
  const verify = buildVerificationEmail(smtp(), 'reader@example.com', 'verify-token');

  assert.equal(reset.to, 'reader@example.com');
  assert.match(reset.text, /https:\/\/tarawing\.app\/reset-password\?token=reset-token/);
  assert.match(verify.text, /https:\/\/tarawing\.app\/verify-email\?token=verify-token/);
  assert.equal(reset.replyTo, 'support@tarawing.app');
});

test('escapes HTML values in mail templates', () => {
  const message = buildPasswordResetEmail(
    smtp({ fromName: 'Tarawing & <Friends>' }),
    'reader+<tag>@example.com',
    'token',
  );

  assert.equal(message.html.includes('<Friends>'), false);
  assert.equal(message.html.includes('reader+&lt;tag&gt;@example.com'), true);
});

test('sends through an injected transport with TLS-safe options', async () => {
  let options;
  let delivered;
  const sendPasswordResetEmailWithTransport = await sendPasswordResetEmail(
    smtp(),
    'reader@example.com',
    'reset-token',
    {
      createTransport: (transportOptions) => {
        options = transportOptions;
        return { sendMail: async (message) => { delivered = message; } };
      },
    },
  );

  assert.equal(sendPasswordResetEmailWithTransport, undefined);
  assert.equal(options.host, 'smtp.example.com');
  assert.equal(options.auth.user, 'mailer');
  assert.equal(options.auth.pass, 'smtp-password');
  assert.equal(options.disableFileAccess, true);
  assert.equal(options.disableUrlAccess, true);
  assert.equal(delivered.to, 'reader@example.com');
});

test('rejects sending when SMTP is disabled or incomplete', async () => {
  await assert.rejects(
    sendVerificationEmail(
      smtp({ enabled: false }),
      'reader@example.com',
      'token',
      { createTransport: () => ({ sendMail: async () => {} }) },
    ),
    (error) => error instanceof MailNotConfiguredError,
  );
});

test('builds a diagnostic test email', () => {
  const message = buildTestEmail(smtp(), 'admin@example.com');
  assert.match(message.subject, /SMTP test/i);
  assert.match(message.text, /configuration is working/i);
});

test('uses the newest enabled custom email template', () => {
  const template = selectEmailTemplate([
    {
      id: 'older',
      kind: 'password_reset',
      status: 'enabled',
      subject: 'Older reset',
      body: 'Older body',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'disabled',
      kind: 'password_reset',
      status: 'disabled',
      subject: 'Disabled reset',
      body: 'Disabled body',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'newer',
      kind: 'password_reset',
      status: 'enabled',
      subject: 'Reset {{site_name}} via {{action_url}}',
      body: 'Hello {{email}}. Open {{action_url}}.',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ], 'password_reset');

  const message = buildPasswordResetEmail(smtp(), 'reader@example.com', 'reset-token', template);
  assert.equal(message.subject, 'Reset Tarawing via https://tarawing.app/reset-password?token=reset-token');
  assert.match(message.text, /Hello reader@example\.com/);
});

test('falls back to the code default when no email template is enabled', () => {
  const selected = selectEmailTemplate([
    { kind: 'email_verification', status: 'disabled', createdAt: '2026-01-01T00:00:00.000Z' },
  ], 'email_verification');

  assert.equal(selected, null);
  const message = buildVerificationEmail(smtp(), 'reader@example.com', 'verify-token', selected);
  assert.match(message.subject, /Verify your Tarawing email/);
  assert.match(message.text, /verify-email\?token=verify-token/);
});

test('builds report-ready email from a custom template', () => {
  const message = buildReportReadyEmail(smtp(), 'reader@example.com', {
    readingType: 'tarot',
    question: 'What now?',
    reportTier: 'deep_insights',
  }, {
    status: 'enabled',
    subject: '{{report_label}} ready',
    body: '{{reading_type}} / {{question}} / {{workspace_url}}',
  });

  assert.equal(message.subject, 'Deep Insights report ready');
  assert.match(message.text, /tarot \/ What now\? \/ https:\/\/tarawing\.app\/dashboard/);
});

test('builds and sends a freeform contact email with user variables', async () => {
  const message = buildContactEmail(smtp(), 'reader@example.com', {
    subject: 'Hello {{name}} from {{site_name}}',
    body: 'Contacting {{email}} about your account.',
  }, { name: 'Reader' });

  assert.equal(message.subject, 'Hello Reader from Tarawing');
  assert.match(message.text, /Contacting reader@example\.com/);

  let delivered;
  await sendContactEmail(smtp(), 'reader@example.com', {
    subject: 'Manual subject',
    body: 'Manual body',
  }, {}, {
    createTransport: () => ({
      sendMail: async (mail) => { delivered = mail; },
    }),
  });
  assert.equal(delivered.subject, 'Manual subject');
  assert.equal(delivered.to, 'reader@example.com');
});
