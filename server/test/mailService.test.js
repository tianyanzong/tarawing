'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SETTINGS_ENCRYPTION_KEY = 'test-settings-encryption-key';

const {
  MailNotConfiguredError,
  buildPasswordResetEmail,
  buildTestEmail,
  buildVerificationEmail,
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
