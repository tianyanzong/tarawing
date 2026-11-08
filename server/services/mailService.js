'use strict';
const nodemailer = require('nodemailer');
const { decryptSecret } = require('./settingsSecurity');
const { DEFAULT_EMAIL_TEMPLATES } = require('../data/defaultTemplates');

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

function displayName(smtp) {
  return String(smtp.fromName || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\r\n"<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sender(smtp) {
  const safeName = displayName(smtp);
  return safeName ? `"${safeName}" <${smtp.fromEmail}>` : smtp.fromEmail;
}

function commonMessage(smtp, to) {
  return {
    from: sender(smtp),
    to,
    replyTo: smtp.replyTo || undefined,
  };
}

function templateTimestamp(template) {
  return Date.parse(template?.createdAt || template?.created_at || template?.updatedAt || template?.updated_at || '') || 0;
}

function selectEmailTemplate(templates, kind) {
  if (!Array.isArray(templates)) return null;
  return templates
    .filter((template) => template?.kind === kind && template.status === 'enabled')
    .sort((a, b) => templateTimestamp(b) - templateTimestamp(a))[0] || null;
}

function renderTemplateString(value, variables) {
  return String(value || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key) => {
    const replacement = variables[key.toLowerCase()];
    return replacement === undefined || replacement === null ? '' : String(replacement);
  });
}

function plainTextToHtml(value) {
  return escapeHtml(value)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replaceAll('\n', '<br />');
}

function buildTemplatedEmail(smtp, to, kind, variables, template) {
  const selected = template?.status === 'enabled' ? template : DEFAULT_EMAIL_TEMPLATES[kind];
  const fullVariables = {
    site_name: displayName(smtp) || 'Tarawing',
    email: to,
    expires_minutes: 30,
    ...variables,
  };
  const subject = renderTemplateString(selected.subject, fullVariables);
  const text = renderTemplateString(selected.body, fullVariables);
  return {
    ...commonMessage(smtp, to),
    subject,
    text,
    html: plainTextToHtml(text),
  };
}

function buildPasswordResetEmail(smtp, to, token, template) {
  const link = publicLink(smtp, '/reset-password', token);
  return buildTemplatedEmail(smtp, to, 'password_reset', { action_url: link }, template);
}

function buildVerificationEmail(smtp, to, token, template) {
  const link = publicLink(smtp, '/verify-email', token);
  return buildTemplatedEmail(smtp, to, 'email_verification', { action_url: link }, template);
}

function buildReportReadyEmail(smtp, to, context = {}, template) {
  const workspaceUrl = new URL('/dashboard', smtp.publicSiteUrl).toString();
  return buildTemplatedEmail(smtp, to, 'report_ready', {
    reading_type: String(context.readingType || 'reading').replaceAll('_', ' '),
    question: context.question || 'No question supplied',
    report_label: context.reportTier === 'deep_insights' ? 'Deep Insights report' : 'Detailed report',
    workspace_url: workspaceUrl,
  }, template);
}

function buildContactEmail(smtp, to, content = {}, variables = {}) {
  const fullVariables = {
    site_name: displayName(smtp) || 'Tarawing',
    email: to,
    ...variables,
  };
  const subject = renderTemplateString(content.subject, fullVariables);
  const text = renderTemplateString(content.body, fullVariables);
  return {
    ...commonMessage(smtp, to),
    subject,
    text,
    html: plainTextToHtml(text),
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

function sendPasswordResetEmail(smtp, to, token, dependencies, template) {
  return deliver(smtp, buildPasswordResetEmail(smtp, to, token, template), dependencies);
}

function sendVerificationEmail(smtp, to, token, dependencies, template) {
  return deliver(smtp, buildVerificationEmail(smtp, to, token, template), dependencies);
}

function sendReportReadyEmail(smtp, to, context, dependencies, template) {
  return deliver(smtp, buildReportReadyEmail(smtp, to, context, template), dependencies);
}

function sendContactEmail(smtp, to, content, variables, dependencies) {
  return deliver(smtp, buildContactEmail(smtp, to, content, variables), dependencies);
}

function sendTestEmail(smtp, to, dependencies) {
  return deliver(smtp, buildTestEmail(smtp, to), dependencies);
}

module.exports = {
  MailNotConfiguredError,
  buildContactEmail,
  buildPasswordResetEmail,
  buildReportReadyEmail,
  buildTestEmail,
  buildVerificationEmail,
  buildTransportOptions,
  DEFAULT_EMAIL_TEMPLATES,
  escapeHtml,
  plainTextToHtml,
  renderTemplateString,
  selectEmailTemplate,
  sendPasswordResetEmail,
  sendReportReadyEmail,
  sendContactEmail,
  sendTestEmail,
  sendVerificationEmail,
};
