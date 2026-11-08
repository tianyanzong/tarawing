/**
 * Settings secrets and public projections.
 *
 * AI credentials live in the PostgreSQL settings blob, not in environment
 * variables. Keep encryption here so route handlers never need to know how
 * secrets are represented or which fields are safe to expose.
 */
'use strict';
const crypto = require('crypto');

const ENCRYPTION_VERSION = 'v1';
const PUBLIC_SETTING_KEYS = [
  'siteName',
  'tagline',
  'supportEmail',
  'donationEnabled',
  'donationMessage',
];
const DEFAULT_SMTP = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  username: '',
  fromName: 'Tarawing',
  fromEmail: '',
  replyTo: '',
  publicSiteUrl: 'http://localhost:3300',
};

function encryptionKey() {
  const source = process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('Settings encryption is not configured.');
  return crypto.createHash('sha256').update(source).digest();
}

function encryptSecret(value) {
  if (typeof value !== 'string' || !value) throw new Error('A non-empty secret is required.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'enc',
    ENCRYPTION_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

function decryptSecret(value) {
  try {
    if (typeof value !== 'string') throw new Error('invalid');
    const parts = value.split(':');
    if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== ENCRYPTION_VERSION) {
      throw new Error('invalid');
    }
    const iv = Buffer.from(parts[2], 'base64');
    const tag = Buffer.from(parts[3], 'base64');
    const encrypted = Buffer.from(parts[4], 'base64');
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) throw new Error('invalid');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('The stored secret could not be decrypted.');
  }
}

function sanitizeAiEndpointsForAdmin(endpoints) {
  if (!Array.isArray(endpoints)) return [];
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    name: endpoint.name,
    adapter: endpoint.adapter,
    model: endpoint.model,
    baseUrl: endpoint.baseUrl || '',
    enabled: endpoint.enabled !== false,
    order: Number.isInteger(endpoint.order) ? endpoint.order : 0,
    hasApiKey: !!endpoint.apiKeyEncrypted,
  }));
}

function mergeAiEndpoints(incoming, existing = []) {
  if (!Array.isArray(incoming)) return [];
  const existingById = new Map(
    existing.filter((endpoint) => endpoint && endpoint.id).map((endpoint) => [endpoint.id, endpoint]),
  );

  return incoming.map((endpoint, index) => {
    const previous = existingById.get(endpoint.id);
    const replacementKey = typeof endpoint.apiKey === 'string' ? endpoint.apiKey.trim() : '';
    const apiKeyEncrypted = replacementKey
      ? encryptSecret(replacementKey)
      : (previous?.apiKeyEncrypted || '');

    return {
      id: endpoint.id,
      name: endpoint.name,
      adapter: endpoint.adapter,
      model: endpoint.model,
      baseUrl: endpoint.baseUrl || '',
      enabled: endpoint.enabled !== false,
      order: Number.isInteger(endpoint.order) ? endpoint.order : index,
      apiKeyEncrypted,
    };
  });
}

function mergeSmtpSettings(incoming = {}, existing = {}) {
  const replacementPassword = typeof incoming.password === 'string' ? incoming.password.trim() : '';
  return {
    enabled: incoming.enabled === true,
    host: String(incoming.host || ''),
    port: Number(incoming.port || DEFAULT_SMTP.port),
    secure: incoming.secure === true,
    username: String(incoming.username || ''),
    passwordEncrypted: replacementPassword
      ? encryptSecret(replacementPassword)
      : (existing.passwordEncrypted || ''),
    fromName: String(incoming.fromName || DEFAULT_SMTP.fromName),
    fromEmail: String(incoming.fromEmail || ''),
    replyTo: String(incoming.replyTo || ''),
    publicSiteUrl: String(incoming.publicSiteUrl || DEFAULT_SMTP.publicSiteUrl),
  };
}

function sanitizeSmtpForAdmin(smtp = {}) {
  return {
    enabled: smtp.enabled === true,
    host: smtp.host || '',
    port: Number(smtp.port || DEFAULT_SMTP.port),
    secure: smtp.secure === true,
    username: smtp.username || '',
    fromName: smtp.fromName || DEFAULT_SMTP.fromName,
    fromEmail: smtp.fromEmail || '',
    replyTo: smtp.replyTo || '',
    publicSiteUrl: smtp.publicSiteUrl || DEFAULT_SMTP.publicSiteUrl,
    hasPassword: !!smtp.passwordEncrypted,
  };
}

function templateTimestamp(template) {
  return Date.parse(template?.updatedAt || template?.updated_at || template?.createdAt || template?.created_at || '') || 0;
}

function normalizeEnabledTemplates(templates) {
  if (!Array.isArray(templates)) return [];
  const winners = new Map();
  for (const template of templates) {
    if (template?.status !== 'enabled') continue;
    const current = winners.get(template.kind);
    if (!current || templateTimestamp(template) > templateTimestamp(current)) {
      winners.set(template.kind, template);
    }
  }
  return templates.map((template) => (
    template?.status === 'enabled' && winners.get(template.kind)?.id !== template.id
      ? { ...template, status: 'disabled' }
      : template
  ));
}

function assertCanDeleteEnabledTemplates(current, incoming, label) {
  if (!Array.isArray(current) || !Array.isArray(incoming)) return;
  const incomingById = new Map(incoming.map((template) => [template.id, template]));
  for (const template of current) {
    if (template?.status !== 'enabled') continue;
    const next = incomingById.get(template.id);
    const removedFromEvent = !next || next.kind !== template.kind;
    if (!removedFromEvent) continue;
    const replacement = incoming.some((candidate) => (
      candidate.id !== template.id
      && candidate.kind === template.kind
      && candidate.status === 'enabled'
    ));
    if (!replacement) {
      throw new Error(`Enable another ${label} template for this event before deleting "${template.name}".`);
    }
  }
}

function settingsForAdmin(settings = {}) {
  return {
    ...settings,
    requireEmailVerification: settings.requireEmailVerification === true,
    aiMechanism: {
      autoGenerateOnPayment: settings.aiMechanism?.autoGenerateOnPayment !== false,
      endpoints: sanitizeAiEndpointsForAdmin(settings.aiMechanism?.endpoints),
    },
    paymentMethods: Array.isArray(settings.paymentMethods) ? settings.paymentMethods : [],
    smtp: sanitizeSmtpForAdmin(settings.smtp),
    emailTemplates: Array.isArray(settings.emailTemplates) ? settings.emailTemplates : [],
    pdfTemplates: Array.isArray(settings.pdfTemplates) ? settings.pdfTemplates : [],
    freeformTemplates: Array.isArray(settings.freeformTemplates) ? settings.freeformTemplates : [],
  };
}

function publicSettings(settings = {}) {
  return Object.fromEntries(
    PUBLIC_SETTING_KEYS
      .filter((key) => settings[key] !== undefined)
      .map((key) => [key, settings[key]]),
  );
}

function publicPaymentMethods(settings = {}) {
  if (!Array.isArray(settings.paymentMethods)) return [];
  return settings.paymentMethods
    .filter((method) => method?.enabled && typeof method.qrImage === 'string' && method.qrImage)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((method) => ({
      id: method.id,
      name: method.name,
      qrImage: method.qrImage,
      order: method.order || 0,
    }));
}

function auditSettings(settings = {}) {
  return {
    siteName: settings.siteName,
    pricing: settings.pricing,
    aiMechanism: {
      autoGenerateOnPayment: settings.aiMechanism?.autoGenerateOnPayment !== false,
      endpoints: sanitizeAiEndpointsForAdmin(settings.aiMechanism?.endpoints),
    },
    paymentMethods: Array.isArray(settings.paymentMethods)
      ? settings.paymentMethods.map((method) => ({
        id: method.id,
        name: method.name,
        enabled: method.enabled,
        order: method.order,
      }))
      : [],
    smtp: settings.smtp ? {
      enabled: settings.smtp.enabled === true,
      host: settings.smtp.host || '',
      port: Number(settings.smtp.port || DEFAULT_SMTP.port),
      secure: settings.smtp.secure === true,
      username: settings.smtp.username || '',
      fromEmail: settings.smtp.fromEmail || '',
      hasPassword: !!settings.smtp.passwordEncrypted,
    } : null,
    emailTemplates: Array.isArray(settings.emailTemplates)
      ? settings.emailTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        kind: template.kind,
        status: template.status,
      }))
      : [],
    pdfTemplates: Array.isArray(settings.pdfTemplates)
      ? settings.pdfTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        kind: template.kind,
        status: template.status,
      }))
      : [],
    freeformTemplates: Array.isArray(settings.freeformTemplates)
      ? settings.freeformTemplates.map((template) => ({
        id: template.id,
        name: template.name,
      }))
      : [],
  };
}

module.exports = {
  assertCanDeleteEnabledTemplates,
  auditSettings,
  decryptSecret,
  encryptSecret,
  mergeAiEndpoints,
  mergeSmtpSettings,
  normalizeEnabledTemplates,
  publicPaymentMethods,
  publicSettings,
  sanitizeAiEndpointsForAdmin,
  sanitizeSmtpForAdmin,
  settingsForAdmin,
};
