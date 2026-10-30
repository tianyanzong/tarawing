'use strict';
const nodemailer = require('nodemailer');
const { decryptSecret } = require('./settingsSecurity');

class MailNotConfiguredError extends Error {
  constructor(message = 'SMTP is not fully configured.') {
    super(message);
    this.name = 'MailNotConfiguredError';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function assertSmtpConfigured(smtp) {
  if (!smtp?.enabled || !smtp.host || !smtp.fromEmail || !smtp.publicSiteUrl) {
    throw new MailNotConfiguredError('Enable SMTP and set Host, From email, and Public site URL first.');
  }
}

function publicLink(smtp, path, token) {
  const url = new URL(path, smtp.publicSiteUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function sender(smtp) {
  const safeName = String(smtp.fromName || '').replace(/[\r\n"<>]/g, ' ').trim();
  return safeName ? `"${safeName}" <${smtp.fromEmail}>` : smtp.fromEmail;
}

function commonMessage(smtp, to) {
  return {
    from: sender(smtp),
    to,
    replyTo: smtp.replyTo || undefined,
  };
}

function buildPasswordResetEmail(smtp, to, token) {
  const link = publicLink(smtp, '/reset-password', token);
  return {
    ...commonMessage(smtp, to),
    subject: 'Reset your Tarawing password',
    text: [
      'We received a request to reset your Tarawing password.',
      '',
      `Reset it within 30 minutes: ${link}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: [
      '<p>We received a request to reset your Tarawing password.</p>',
      `<p>Account: ${escapeHtml(to)}</p>`,
      `<p><a href="${escapeHtml(link)}">Reset your password</a></p>`,
      '<p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>',
    ].join(''),
  };
}

function buildVerificationEmail(smtp, to, token) {
  const link = publicLink(smtp, '/verify-email', token);
  return {
    ...commonMessage(smtp, to),
    subject: 'Verify your Tarawing email',
    text: [
      'Please verify the email address for your Tarawing account.',
      '',
      `Verify within 30 minutes: ${link}`,
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
    html: [
      '<p>Please verify the email address for your Tarawing account.</p>',
      `<p>Account: ${escapeHtml(to)}</p>`,
      `<p><a href="${escapeHtml(link)}">Verify your email</a></p>`,
      '<p>This link expires in 30 minutes. If you did not create this account, you can ignore this email.</p>',
    ].join(''),
  };
}

function buildTestEmail(smtp, to) {
  return {
    ...commonMessage(smtp, to),
    subject: 'Tarawing SMTP test',
    text: `This is a Tarawing SMTP test. Your email configuration is working.\n\nSite: ${smtp.publicSiteUrl}`,
    html: `<p>This is a Tarawing SMTP test. Your email configuration is working.</p><p>Site: ${escapeHtml(smtp.publicSiteUrl)}</p>`,
  };
}

function buildTransportOptions(smtp) {
  assertSmtpConfigured(smtp);
  const password = smtp.passwordEncrypted ? decryptSecret(smtp.passwordEncrypted) : '';
  return {
    host: smtp.host,
    port: Number(smtp.port || 587),
    secure: smtp.secure === true,
    requireTLS: smtp.secure !== true && Number(smtp.port) === 587,
    auth: smtp.username ? { user: smtp.username, pass: password } : undefined,
    tls: { minVersion: 'TLSv1.2' },
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

async function deliver(smtp, message, dependencies = {}) {
  assertSmtpConfigured(smtp);
  const transport = (dependencies.createTransport || nodemailer.createTransport)(
    buildTransportOptions(smtp),
  );
  await transport.sendMail(message);
}

function sendPasswordResetEmail(smtp, to, token, dependencies) {
  return deliver(smtp, buildPasswordResetEmail(smtp, to, token), dependencies);
}

function sendVerificationEmail(smtp, to, token, dependencies) {
  return deliver(smtp, buildVerificationEmail(smtp, to, token), dependencies);
}

function sendTestEmail(smtp, to, dependencies) {
  return deliver(smtp, buildTestEmail(smtp, to), dependencies);
}

module.exports = {
  MailNotConfiguredError,
  buildPasswordResetEmail,
  buildTestEmail,
  buildVerificationEmail,
  buildTransportOptions,
  escapeHtml,
  sendPasswordResetEmail,
  sendTestEmail,
  sendVerificationEmail,
};
